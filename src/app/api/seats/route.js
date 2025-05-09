import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getStationSegments } from "@/lib/stationSegments";
import { createClient } from "redis";

const prisma = new PrismaClient();

// Khởi tạo Redis client toàn cục
let redisClient;
async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        tls: process.env.REDIS_URL?.startsWith("rediss://"),
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error("Hết lần thử kết nối Redis, bỏ qua cache.");
            return new Error("Hết lần thử kết nối Redis");
          }
          return Math.min(retries * 1000, 3000);
        },
      },
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    redisClient.on("connect", () => console.log("Kết nối Redis thành công"));
    redisClient.on("end", () => console.log("Mất kết nối Redis"));

    try {
      await redisClient.connect();
    } catch (err) {
      console.error("Không thể kết nối Redis:", err.message);
      throw err;
    }
  }
  return redisClient;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const getSeatTypeMultiplier = (seatType) => {
  switch (seatType) {
    case "soft":
      return 1.0;
    case "hard_sleeper_6":
      return 1.1;
    case "hard_sleeper_4":
      return 1.2;
    default:
      return 1.0;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = parseInt(searchParams.get("trainID"));
    const travelDate = searchParams.get("travel_date");
    const fromStationID = parseInt(searchParams.get("from_station_id"));
    const toStationID = parseInt(searchParams.get("to_station_id"));

    console.log("Yêu cầu tham số:", {
      trainID,
      travelDate,
      fromStationID,
      toStationID,
    });

    if (!trainID || !travelDate || !fromStationID || !toStationID) {
      console.error("Thiếu tham số bắt buộc:", {
        trainID,
        travelDate,
        fromStationID,
        toStationID,
      });
      return new NextResponse(
        JSON.stringify({ error: "Thiếu tham số bắt buộc" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Kiểm tra cache
    let client;
    try {
      client = await initRedis();
      if (client.isOpen) {
        const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
        const cached = await client.get(cacheKey);
        if (cached) {
          console.log("Cache hit cho key:", cacheKey);
          return new NextResponse(cached, {
            status: 200,
            headers: corsHeaders,
          });
        }
        console.log("Cache miss cho key:", cacheKey);
      } else {
        console.warn("Redis không kết nối, bỏ qua cache");
      }
    } catch (redisError) {
      console.warn("Redis không khả dụng, bỏ qua cache:", redisError.message);
    }

    const dateStart = new Date(travelDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    console.log("Ngày được chuyển đổi:", dateStart.toISOString());

    // Lấy ghế từ seattrain
    const seats = await prisma.seattrain.findMany({
      where: {
        trainID: trainID,
        travel_date: dateStart,
      },
      select: {
        seatID: true,
        seat_type: true,
        coach: true,
        seat_number: true,
        is_available: true,
      },
    });

    console.log(
      `Tìm thấy ${seats.length} ghế cho trainID ${trainID} ngày ${travelDate}`
    );

    if (seats.length === 0) {
      console.warn(
        `Không tìm thấy ghế trong seattrain cho trainID ${trainID} ngày ${travelDate}`
      );
      return new NextResponse(
        JSON.stringify({
          error: "Không tìm thấy ghế cho tàu này vào ngày đã chọn",
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const seatIDs = seats.map((seat) => seat.seatID);

    // Lấy đoạn tuyến
    const segments = await getStationSegments(
      trainID,
      fromStationID,
      toStationID
    );
    const segmentsToSum = segments.map((segment) => ({
      from: parseInt(segment.from_station_id),
      to: parseInt(segment.to_station_id),
    }));

    if (segmentsToSum.length === 0) {
      console.warn(
        `Không tìm thấy đoạn tuyến cho trainID ${trainID} từ ga ${fromStationID} đến ${toStationID}`
      );
      return new NextResponse(
        JSON.stringify({ error: "Không tìm thấy đoạn tuyến giữa các ga" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Gộp truy vấn seat_availability_segment
    const segmentConditions = segmentsToSum.map((segment) => ({
      from_station_id: segment.from,
      to_station_id: segment.to,
    }));

    const segmentAvailability = await prisma.seat_availability_segment.findMany(
      {
        where: {
          seatID: { in: seatIDs },
          trainID: trainID,
          travel_date: dateStart,
        },
        select: {
          seatID: true,
          from_station_id: true,
          to_station_id: true,
          is_available: true,
        },
      }
    );

    console.log(
      "Đoạn khả dụng cho trainID",
      trainID,
      ":",
      segmentAvailability.length
    );

    // Kiểm tra trạng thái ghế
    const seatsWithAvailability = seats.map((seat) => {
      const seatAvailability = segmentAvailability.filter(
        (avail) => avail.seatID === seat.seatID
      );
      const isAvailable =
        seat.is_available &&
        segmentsToSum.every((segment) => {
          const match = seatAvailability.find(
            (avail) =>
              avail.from_station_id === segment.from &&
              avail.to_station_id === segment.to
          );
          return match ? match.is_available : false;
        });
      return { ...seat, is_available: isAvailable };
    });

    // Tính tổng base_price từ route_segment
    let totalBasePrice = 0;
    for (const segment of segmentsToSum) {
      const routeSegment = await prisma.route_segment.findFirst({
        where: {
          from_station_id: segment.from,
          to_station_id: segment.to,
        },
        select: { base_price: true },
      });

      if (!routeSegment) {
        console.warn(
          `Không tìm thấy đoạn tuyến từ ga ${segment.from} đến ${segment.to}`
        );
        return new NextResponse(
          JSON.stringify({
            error: `Không tìm thấy đoạn tuyến từ ga ${segment.from} đến ${segment.to}`,
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      totalBasePrice += parseFloat(routeSegment.base_price);
    }

    console.log("Tổng giá cơ bản cho các đoạn:", totalBasePrice);

    // Nhóm ghế theo seat_type và coach
    const seatMap = {};
    seatsWithAvailability.forEach((seat) => {
      const seat_type = seat.seat_type;
      const coach = seat.coach;

      if (!seatMap[seat_type]) seatMap[seat_type] = {};
      if (!seatMap[seat_type][coach]) seatMap[seat_type][coach] = [];

      seatMap[seat_type][coach].push({
        seat_number: seat.seat_number,
        is_available: seat.is_available,
      });
    });

    // Tính giá vé và định dạng kết quả
    const formattedResult = Object.keys(seatMap)
      .map((seat_type) => {
        const coaches = seatMap[seat_type] || {};
        const coachKeys = Object.keys(coaches);
        if (coachKeys.length === 0) return null;
        const totalAvailable = coachKeys.reduce(
          (sum, coach) =>
            sum + coaches[coach].filter((s) => s.is_available === true).length,
          0
        );

        const multiplier = getSeatTypeMultiplier(seat_type);
        const price = totalBasePrice * multiplier;

        return {
          seat_type,
          available: totalAvailable,
          price: parseFloat(price.toFixed(2)),
          coaches: coachKeys.map((coach) => ({
            coach,
            seat_numbers: coaches[coach] || [],
          })),
        };
      })
      .filter((result) => result !== null);

    console.log("Kết quả định dạng cho trainID", trainID, ":", formattedResult);

    // Lưu vào cache
    if (client && client.isOpen) {
      try {
        const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
        await client.setEx(cacheKey, 3600, JSON.stringify(formattedResult)); // TTL tăng lên 1 giờ
        console.log("Đã lưu cache cho key:", cacheKey);
      } catch (redisError) {
        console.warn("Không thể lưu cache:", redisError.message);
      }
    }

    return new NextResponse(JSON.stringify(formattedResult), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lỗi khi lấy ghế:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    return new NextResponse(
      JSON.stringify({
        error: "Lỗi hệ thống",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
