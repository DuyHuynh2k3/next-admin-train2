import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient(); // Không cần cấu hình datasources, lấy DATABASE_URL từ .env

// Khởi tạo Redis client toàn cục
let redisClient;
async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379", // Cập nhật trên EC2
    });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    try {
      await redisClient.connect();
      console.log("Kết nối Redis thành công");
    } catch (err) {
      console.error("Không thể kết nối Redis:", err.message);
    }
  }
  return redisClient;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click", // Cập nhật cho production
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    // Kiểm tra cache Redis
    let client;
    try {
      client = await initRedis();
      const cached = await client.get("stations");
      if (cached) {
        console.log("Cache hit for stations");
        return new NextResponse(cached, { status: 200, headers: corsHeaders });
      }
    } catch (redisError) {
      console.warn("Redis unavailable, skipping cache:", redisError.message);
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

    // Lưu vào cache với TTL 1 giờ (3600 giây)
    if (client) {
      try {
        await client.setEx("stations", 3600, JSON.stringify(stations));
        console.log("Cached stations");
      } catch (redisError) {
        console.warn("Failed to cache stations:", redisError.message);
      }
    }

    return new NextResponse(JSON.stringify(stations), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching stations:", {
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
