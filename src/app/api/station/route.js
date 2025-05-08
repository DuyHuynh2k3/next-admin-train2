import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient();

// Singleton Redis client
let redisClient = null;
let redisConnected = false;

async function initRedis() {
  if (redisClient && redisConnected) {
    return redisClient; // Tái sử dụng client đã kết nối
  }

  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://172.17.0.3:6379",
    socket: {
      tls: process.env.REDIS_URL?.startsWith("rediss://"), // Bật TLS nếu dùng rediss://
      connectTimeout: 5000, // Timeout 5 giây
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.error("Hết lần thử kết nối Redis, bỏ qua cache.");
          return new Error("Hết lần thử kết nối Redis");
        }
        return Math.min(retries * 1000, 3000); // Retry sau 1s, 2s, 3s
      },
    },
    retryStrategy: (times) => {
      return Math.min(times * 100, 2000); // Retry tối đa 2 giây
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  let client;
  try {
    // Khởi tạo Redis client
    client = await initRedis();

    // Kiểm tra cache
    if (redisConnected) {
      try {
        const cached = await client.get("stations");
        if (cached) {
          console.log("Cache hit for stations");
          return new NextResponse(cached, {
            status: 200,
            headers: corsHeaders,
          });
        }
        console.log("Cache miss for stations");
      } catch (redisError) {
        console.warn(
          "Lỗi khi truy cập Redis, bỏ qua cache:",
          redisError.message
        );
      }
    } else {
      console.warn("Redis không khả dụng, bỏ qua cache");
    }

    // Truy vấn database nếu không có cache
    const stations = await prisma.station.findMany({
      select: {
        station_id: true,
        station_name: true,
      },
    });

    console.log("Fetched stations:", stations);

    if (!stations || stations.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Không tìm thấy ga nào" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Lưu vào cache nếu Redis khả dụng
    if (redisConnected) {
      try {
        await client.setEx("stations", 86400, JSON.stringify(stations)); // TTL 24h
        console.log("Cached stations");
      } catch (redisError) {
        console.warn("Không thể lưu cache stations:", redisError.message);
      }
    }

    return new NextResponse(JSON.stringify(stations), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lỗi khi lấy stations:", {
      message: error.message,
      stack: error.stack,
    });
    return new NextResponse(
      JSON.stringify({ error: "Lỗi cơ sở dữ liệu", details: error.message }),
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
