import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient();

let redisClient;
async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://172.17.0.3:6379",
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    let client;
    try {
      client = await initRedis();
      const cached = await client.get("stations");
      if (cached) {
        console.log("Cache hit for stations");
        return new NextResponse(cached, { status: 200, headers: corsHeaders });
      }
      console.log("Cache miss for stations");
    } catch (redisError) {
      console.warn("Redis unavailable, skipping cache:", redisError.message);
    }

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

    if (client) {
      try {
        await client.setEx("stations", 86400, JSON.stringify(stations)); // TTL 24h
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
