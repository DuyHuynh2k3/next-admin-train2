// src/lib/stationSegments.js
import prisma from "./prisma";
import redis from "redis";

// Khởi tạo Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379", // Cập nhật URL Redis của bạn
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));

// Kết nối Redis (chỉ gọi một lần khi server khởi động)
redisClient.connect().catch((err) => {
  console.error("Không thể kết nối Redis:", err);
});

export const getStationSegments = async (
  trainID,
  fromStationId,
  toStationId
) => {
  try {
    // Kiểm tra cache
    const cacheKey = `train_stops:${trainID}`;
    const cachedStops = await redisClient.get(cacheKey);
    let allStops;

    if (cachedStops) {
      console.log(`Cache hit cho trainID=${trainID}`);
      allStops = JSON.parse(cachedStops);
    } else {
      console.log(`Cache miss cho trainID=${trainID}, truy vấn database`);
      // Truy vấn chỉ các cột cần thiết
      allStops = await prisma.train_stop.findMany({
        where: { trainID },
        orderBy: { stop_order: "asc" },
        select: {
          station_id: true,
          stop_order: true,
        },
      });

      // Lưu vào cache với TTL 1 giờ (3600 giây)
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(allStops));
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
