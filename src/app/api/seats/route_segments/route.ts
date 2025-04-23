// src/app/api/seats/route_segments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStationSegments } from "./utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainID = Number(searchParams.get("trainID"));
  const fromStationId = Number(searchParams.get("fromStationId"));
  const toStationId = Number(searchParams.get("toStationId"));

  if (isNaN(trainID) || isNaN(fromStationId) || isNaN(toStationId)) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ" },
      { status: 400 }
    );
  }

  const segments = await getStationSegments(
    trainID,
    fromStationId,
    toStationId
  );
  return NextResponse.json(segments);
}
