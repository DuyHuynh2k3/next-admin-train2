import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const queryParams = req.nextUrl.searchParams;
    const departureStation = queryParams.get("departureStation");
    const arrivalStation = queryParams.get("arrivalStation");
    const departureDate = queryParams.get("departureDate");

    if (!departureStation || !arrivalStation || !departureDate) {
      return NextResponse.json(
        {
          error: "Vui lòng cung cấp đủ thông tin về ga đi, ga đến và ngày đi.",
        },
        { status: 400 }
      );
    }

    const formattedDate = new Date(departureDate);
    if (isNaN(formattedDate)) {
      return NextResponse.json(
        { error: "Ngày đi không hợp lệ." },
        { status: 400 }
      );
    }

    // Tính khoảng thời gian từ 00:00 đến 23:59 cùng ngày
    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(departureDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Lấy tất cả chuyến tàu có 2 ga xuất hiện trong danh sách điểm dừng và lịch chạy đúng ngày
    const matchedTrains = await prisma.train.findMany({
      where: {
        train_stop: {
          some: {
            station: { station_name: departureStation },
          },
        },
        AND: {
          train_stop: {
            some: {
              station: { station_name: arrivalStation },
            },
          },
        },
        schedule: {
          some: {
            departTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
      include: {
        train_stop: {
          include: {
            station: true,
          },
        },
        schedule: {
          where: {
            departTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
    });
    

    // Lọc lại để đảm bảo thứ tự ga đến phải sau ga đi
    const validTrains = matchedTrains.filter((train) => {
      const stops = train.train_stop;

      const departureStop = stops.find(
        (stop) => stop.station.station_name === departureStation
      );
      const arrivalStop = stops.find(
        (stop) => stop.station.station_name === arrivalStation
      );

      return (
        departureStop &&
        arrivalStop &&
        arrivalStop.stop_order > departureStop.stop_order
      );
    });

    const response = NextResponse.json(validTrains, { status: 200 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    return response;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm chuyến tàu:", error);
    return NextResponse.json(
      { error: "Lỗi khi tìm kiếm chuyến tàu", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
