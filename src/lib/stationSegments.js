import prisma from "./prisma";
import { createClient } from "redis";

// Khởi tạo Redis client
let redisClient;
let redisConnected = false;

async function initRedis() {
  if (redisClient && redisConnected) {
    return redisClient;
  }

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
    retryStrategy: (times) => {
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on("error", (err) => console.error("Redis Client Error:", err));
  redisClient.on("connect", () => {
    redisConnected = true;
    console.log("Kết nối Redis thành công");
  });
  redisClient.on("end", () => {
    redisConnected = false;
    console.log("Mất kết nối Redis");
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Không thể kết nối Redis:", err.message);
    redisConnected = false;
  }

  return redisClient;
}

export const getStationSegments = async (
  trainID,
  fromStationId,
  toStationId
) => {
  try {
    let allStops;
    const cacheKey = `train_stops:${trainID}`;

    // Thử lấy từ cache nếu Redis đã kết nối
    const client = await initRedis();
    if (redisConnected) {
      try {
        const cachedStops = await client.get(cacheKey);
        if (cachedStops) {
          console.log(`Cache hit cho trainID=${trainID}`);
          allStops = JSON.parse(cachedStops);
        } else {
          console.log(`Cache miss cho trainID=${trainID}`);
        }
      } catch (redisError) {
        console.error("Lỗi khi truy cập Redis:", redisError);
      }
    } else {
      console.warn("Redis không khả dụng, bỏ qua cache");
    }

    // Nếu không có cache, truy vấn database
    if (!allStops) {
      console.log(
        `Cache miss hoặc Redis không khả dụng cho trainID=${trainID}, truy vấn database`
      );
      allStops = await prisma.train_stop.findMany({
        where: { trainID },
        orderBy: { stop_order: "asc" },
        select: {
          station_id: true,
          stop_order: true,
        },
      });

      // Lưu vào cache nếu Redis đã kết nối
      if (redisConnected) {
        try {
          await client.setEx(cacheKey, 3600, JSON.stringify(allStops));
          console.log(`Cached train_stops cho trainID=${trainID}`);
        } catch (redisError) {
          console.error("Lỗi khi lưu cache Redis:", redisError);
        }
      }
    }

    // Tạo Map để tra cứu nhanh stop_order
    const stopMap = new Map(
      allStops.map((stop) => [stop.station_id, stop.stop_order])
    );
    const fromOrder = stopMap.get(fromStationId);
    const toOrder = stopMap.get(toStationId);

    // Kiểm tra tính hợp lệ
    if (!fromOrder || !toOrder || fromOrder >= toOrder) {
      console.log(`Invalid stations: from=${fromStationId}, to=${toStationId}`);
      return [];
    }

    // Tạo segments
    const segments = [];
    for (let i = 0; i < allStops.length - 1; i++) {
      if (
        allStops[i].stop_order >= fromOrder &&
        allStops[i + 1].stop_order <= toOrder
      ) {
        segments.push({
          from_station_id: allStops[i].station_id,
          to_station_id: allStops[i + 1].station_id,
        });
      }
    }

    return segments;
  } catch (error) {
    console.error("Lỗi khi lấy đoạn ga:", {
      message: error.message,
      stack: error.stack,
    });
    return [];
  }
};
