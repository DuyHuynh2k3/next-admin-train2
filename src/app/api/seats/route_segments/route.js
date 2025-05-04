// src/app/api/seats/route_segments/route.js
import { NextResponse } from "next/server";
import { getStationSegments } from "@/lib/stationSegments";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3001",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = parseInt(searchParams.get("trainID"));
    const fromStationID = parseInt(searchParams.get("from_station_id"));
    const toStationID = parseInt(searchParams.get("to_station_id"));

    console.log("Request Params:", { trainID, fromStationID, toStationID });

    if (!trainID || !fromStationID || !toStationID) {
      return new NextResponse(
        JSON.stringify({ error: "Thiếu tham số bắt buộc" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const segments = await getStationSegments(
      trainID,
      fromStationID,
      toStationID
    );
    return new NextResponse(JSON.stringify(segments), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lỗi trong route_segments:", {
      message: error.message,
      stack: error.stack,
    });
    return new NextResponse(
      JSON.stringify({ error: "Lỗi máy chủ nội bộ", details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
