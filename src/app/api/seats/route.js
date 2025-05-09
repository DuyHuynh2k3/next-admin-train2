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
        tls: process.env.REDIS_URL?.startsWith("rediss://"), // Bật TLS nếu dùng rediss://
        connectTimeout: 5000, // Timeout 5 giây
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error("Hết lần thử kết nối Redis, bỏ qua cache.");
            return new Error("Hết lần thử kết nối Redis");
          }
          return Math.min(retries * 1000, 3000);
        },
      },
      retryStrategy: (times) => {
        return Math.min(times * 100, 2000); // Retry tối đa 2 giây
      },
    });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    redisClient.on("connect", () => {
      console.log("Kết nối Redis thành công");
    });
    redisClient.on("end", () => {
      console.log("Mất kết nối Redis");
    });

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

    console.log("Request Params:", {
      trainID,
      travelDate,
      fromStationID,
      toStationID,
    });

    if (!trainID || !travelDate || !fromStationID || !toStationID) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Kiểm tra cache
    let client;
    try {
      client = await initRedis();
      const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
      const cached = await client.get(cacheKey);
      if (cached) {
        console.log("Cache hit for key:", cacheKey);
        return new NextResponse(cached, { status: 200, headers: corsHeaders });
      }
      console.log("Cache miss for key:", cacheKey);
    } catch (redisError) {
      console.warn("Redis unavailable, skipping cache:", redisError.message);
    }

    const dateStart = new Date(travelDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    console.log("Converted Date:", dateStart);

    // Lấy ghế với các cột cần thiết
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

    console.log("Seats Before Availability for trainID", trainID, ":", seats);

    if (seats.length === 0) {
      return new NextResponse(
        JSON.stringify({
          error: "No seats found for this train on the specified date",
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
      return new NextResponse(
        JSON.stringify({
          error: "No route segments found between the stations",
        }),
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
          is_available: true,
          OR: segmentConditions,
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
      "Availability Segments for trainID",
      trainID,
      ":",
      segmentAvailability
    );

    const seatsWithAvailability = seats.map((seat) => {
      const seatAvailability = segmentAvailability.filter(
        (avail) => avail.seatID === seat.seatID
      );
      return {
        ...seat,
        seat_availability_segment: seatAvailability,
      };
    });

    console.log(
      "Seats With Availability for trainID",
      trainID,
      ":",
      seatsWithAvailability
    );

    const availableSeats = seatsWithAvailability.filter((seat) => {
      const availabilitySegments = seat.seat_availability_segment;
      return segmentsToSum.every((segment) => {
        const match = availabilitySegments.find(
          (avail) =>
            avail.from_station_id === segment.from &&
            avail.to_station_id === segment.to
        );
        return match && match.is_available === true;
      });
    });

    console.log(
      "Available Seats After Filter for trainID",
      trainID,
      ":",
      availableSeats
    );

    // Tính tổng base_price từ route_segment
    let totalBasePrice = 0;
    for (const segment of segmentsToSum) {
      const routeSegment = await prisma.route_segment.findFirst({
        where: {
          from_station_id: segment.from,
          to_station_id: segment.to,
        },
        select: {
          base_price: true,
        },
      });

      if (!routeSegment) {
        return new NextResponse(
          JSON.stringify({
            error: `No route segment found between stations ${segment.from} and ${segment.to}`,
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      totalBasePrice += parseFloat(routeSegment.base_price);
    }

    console.log("Total Base Price for segments:", totalBasePrice);

    // Nhóm ghế theo seat_type và coach
    const seatMap = {};
    seats.forEach((seat) => {
      const seat_type = seat.seat_type;
      const coach = seat.coach;

      if (!seatMap[seat_type]) {
        seatMap[seat_type] = {};
      }
      if (!seatMap[seat_type][coach]) {
        seatMap[seat_type][coach] = [];
      }

      const isAvailable = availableSeats.some(
        (availableSeat) => availableSeat.seatID === seat.seatID
      );

      seatMap[seat_type][coach].push({
        seat_number: seat.seat_number,
        is_available: isAvailable,
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

    console.log("Formatted Result for trainID", trainID, ":", formattedResult);

    // Lưu vào cache
    if (client) {
      try {
        const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
        await client.setEx(cacheKey, 600, JSON.stringify(formattedResult));
        console.log("Cached result for key:", cacheKey);
      } catch (redisError) {
        console.warn("Failed to cache result:", redisError.message);
      }
    }

    return new NextResponse(JSON.stringify(formattedResult), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching seats:", {
      message: error.message,
      stack: error.stack,
    });
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
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
