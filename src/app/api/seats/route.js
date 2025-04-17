import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seatTypePriceMultiplier = {
  soft: 1.1,
  hard_sleeper_4: 1.2,
  hard_sleeper_6: 1.3,
};

export async function GET(req) {
  try {
    const queryParams = req.nextUrl.searchParams;

    const trainID = parseInt(queryParams.get("trainID"));
    const travelDate = queryParams.get("travel_date");
    const fromStationID = parseInt(queryParams.get("from_station_id"));
    const toStationID = parseInt(queryParams.get("to_station_id"));

    if (!trainID || !travelDate || !fromStationID || !toStationID) {
      return NextResponse.json(
        { error: "Thiếu tham số trainID, travel_date, from_station_id hoặc to_station_id" },
        { status: 400 }
      );
    }

    const date = new Date(travelDate);

    const stops = await prisma.train_stop.findMany({
      where: { trainID },
      orderBy: { stop_order: "asc" },
      select: {
        station_id: true,
        stop_order: true,
      },
    });

    const fromStop = stops.find((s) => s.station_id === fromStationID);
    const toStop = stops.find((s) => s.station_id === toStationID);

    if (!fromStop || !toStop) {
      return NextResponse.json(
        { error: "Không tìm thấy ga xuất phát hoặc ga đến trong train_stop." },
        { status: 404 }
      );
    }

    const [minOrder, maxOrder] = [fromStop.stop_order, toStop.stop_order].sort((a, b) => a - b);

    const segmentsToSum = [];
    for (let i = minOrder; i < maxOrder; i++) {
      const from = stops.find((s) => s.stop_order === i)?.station_id;
      const to = stops.find((s) => s.stop_order === i + 1)?.station_id;
      if (from && to) {
        segmentsToSum.push({ from, to });
      }
    }

    let totalBasePrice = 0;
    for (const segment of segmentsToSum) {
      const routeSegment = await prisma.route_segment.findUnique({
        where: {
          from_station_id_to_station_id: {
            from_station_id: segment.from,
            to_station_id: segment.to,
          },
        },
      });

      if (!routeSegment) {
        return NextResponse.json(
          { error: `Không tìm thấy route_segment từ ${segment.from} đến ${segment.to}` },
          { status: 404 }
        );
      }

      totalBasePrice += parseFloat(routeSegment.base_price);
    }

    const availableSeats = await prisma.seattrain.findMany({
      where: {
        trainID,
        travel_date: date,
        is_available: true,
      },
      select: {
        coach: true,
        seat_number: true,
      },
    });

    const seatTemplates = await prisma.seat_template.findMany({
      where: { trainID },
      select: {
        coach: true,
        seat_number: true,
        seat_type: true,
        floor: true, 
      },
    });

    const resultMap = {};

    for (const seat of availableSeats) {
      const matched = seatTemplates.find(
        (t) =>
          t.coach === seat.coach &&
          t.seat_number === seat.seat_number
      );

      if (matched) {
        const type = matched.seat_type;

        if (!resultMap[type]) {
          resultMap[type] = {
            seat_type: type,
            available: 0,
            price: parseFloat((totalBasePrice * (seatTypePriceMultiplier[type] || 1)).toFixed(2)),
            coaches: {},
          };
        }

        resultMap[type].available += 1;

        if (!resultMap[type].coaches[seat.coach]) {
          resultMap[type].coaches[seat.coach] = {
            available: 0,
            seat_numbers: [],
          };
        }

        resultMap[type].coaches[seat.coach].available += 1;
        resultMap[type].coaches[seat.coach].seat_numbers.push({
          seat_number: seat.seat_number,
          floor: matched.floor, 
        });
      }
    }

    const formattedResult = Object.values(resultMap).map((entry) => ({
      ...entry,
      coaches: Object.entries(entry.coaches).map(([coach, data]) => ({
        coach,
        available: data.available,
        seat_numbers: data.seat_numbers,
      })),
    }));

    return NextResponse.json(formattedResult, { status: 200 });

  } catch (err) {
    console.error("Lỗi API ghế:", err);
    return NextResponse.json({ error: "Lỗi server", detail: err.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
