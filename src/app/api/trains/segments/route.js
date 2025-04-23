//src/app/api/trains/segments/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trainID = searchParams.get("trainID");

  if (!trainID) {
    return NextResponse.json(
      { error: "Train ID is required" },
      { status: 400 }
    );
  }

  try {
    const segments = await prisma.$queryRaw`
      SELECT 
        rs.segment_id,
        t.trainID,
        t.train_name,
        st1.station_name AS from_station,
        st2.station_name AS to_station,
        rs.base_price AS current_price,
        DATE_FORMAT(ts1.departure_time, '%H:%i') AS depart_time,
        DATE_FORMAT(ts2.arrival_time, '%H:%i') AS arrival_time,
        rs.duration
      FROM 
        train t
      JOIN 
        train_stop ts1 ON t.trainID = ts1.trainID
      JOIN 
        train_stop ts2 ON t.trainID = ts2.trainID AND ts2.stop_order = ts1.stop_order + 1
      JOIN 
        route_segment rs ON rs.from_station_id = ts1.station_id AND rs.to_station_id = ts2.station_id
      JOIN 
        station st1 ON ts1.station_id = st1.station_id
      JOIN 
        station st2 ON ts2.station_id = st2.station_id
      WHERE 
        t.trainID = ${parseInt(trainID)}
      ORDER BY 
        ts1.stop_order
    `;

    return NextResponse.json(segments);
  } catch (error) {
    console.error("Error fetching segments:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request) {
  try {
    const { segment_id, new_price } = await request.json();

    if (!segment_id || isNaN(new_price) || new_price < 0) {
      return NextResponse.json(
        { error: "Invalid segment ID or price" },
        { status: 400 }
      );
    }

    const updatedSegment = await prisma.route_segment.update({
      where: { segment_id: parseInt(segment_id) },
      data: { base_price: parseFloat(new_price) },
    });

    return NextResponse.json({
      message: "Price updated successfully",
      data: updatedSegment,
    });
  } catch (error) {
    console.error("Error updating segment price:", error);
    return NextResponse.json(
      { error: "Failed to update price", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
