// Thêm route API mới trong app/api/trains/route/segments/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trainID = searchParams.get("trainID");

  if (!trainID) {
    return NextResponse.json(
      { error: "Thiếu tham số trainID" },
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
    console.error("Lỗi khi lấy dữ liệu chặng đường:", error);
    return NextResponse.json(
      { error: "Lỗi khi lấy dữ liệu chặng đường", details: error.message },
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
        { error: "ID chặng đường hoặc giá vé không hợp lệ" },
        { status: 400 }
      );
    }

    // Thêm console.log để debug
    console.log(`Updating segment ${segment_id} with price ${new_price}`);

    const updatedSegment = await prisma.route_segment.update({
      where: { segment_id: parseInt(segment_id) },
      data: { base_price: parseFloat(new_price) },
    });

    console.log("Update successful:", updatedSegment);

    return NextResponse.json({
      message: "Cập nhật giá vé thành công",
      data: updatedSegment,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật giá vé:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá vé",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
