// src/app/api/station/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://front.goticket.click",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
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

// Xử lý yêu cầu OPTIONS (preflight CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
