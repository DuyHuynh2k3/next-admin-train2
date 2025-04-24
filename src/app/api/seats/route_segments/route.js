// src/app/api/seats/route_segments/route.js
import { NextResponse } from "next/server";
import { getStationSegments } from "@/lib/stationSegments";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = parseInt(searchParams.get("trainID"));
    const fromStationID = parseInt(searchParams.get("from_station_id"));
    const toStationID = parseInt(searchParams.get("to_station_id"));

    if (!trainID || !fromStationID || !toStationID) {
      return NextResponse.json(
        { error: "Thiếu tham số bắt buộc" },
        { status: 400 }
      );
    }

    const segments = await getStationSegments(
      trainID,
      fromStationID,
      toStationID
    );
    return NextResponse.json(segments);
  } catch (error) {
    console.error("Lỗi trong route_segments:", error.message);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
