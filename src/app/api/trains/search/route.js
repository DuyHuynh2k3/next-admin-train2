// src/app/api/trains/search/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req) {
  const queryParams = req.nextUrl.searchParams;
  const departureStation = queryParams.get("departureStation");
  const arrivalStation = queryParams.get("arrivalStation");
  const departureDate = queryParams.get("departureDate");
  const returnDate = queryParams.get("returnDate");

  if (!departureStation || !arrivalStation || !departureDate) {
    return NextResponse.json(
      { error: "Vui lòng cung cấp ga đi, ga đến và ngày đi." },
      { status: 400 }
    );
  }

  const parseDateRange = (dateStr) => {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const { start: startGo, end: endGo } = parseDateRange(departureDate);

  // Tìm chuyến đi (chiều đi)
  const outboundTrains = await prisma.train.findMany({
    where: {
      AND: [
        {
          train_stop: {
            some: { station: { station_name: departureStation } },
          },
        },
        {
          train_stop: {
            some: { station: { station_name: arrivalStation } },
          },
        },
        {
          schedule: {
            some: {
              departTime: {
                gte: startGo,
                lte: endGo,
              },
            },
          },
        },
      ],
    },
    include: {
      train_stop: { include: { station: true } },
      schedule: {
        where: {
          departTime: {
            gte: startGo,
            lte: endGo,
          },
        },
      },
    },
  });

  const validOutbound = outboundTrains.filter((train) => {
    const stops = train.train_stop;
    const dStop = stops.find(
      (s) => s.station.station_name === departureStation
    );
    const aStop = stops.find((s) => s.station.station_name === arrivalStation);
    return dStop && aStop && aStop.stop_order > dStop.stop_order;
  });

  // Xử lý chiều về (nếu có)
  let validReturn = [];
  if (returnDate) {
    const { start: startReturn, end: endReturn } = parseDateRange(returnDate);
    const returnTrains = await prisma.train.findMany({
      where: {
        AND: [
          {
            train_stop: {
              some: { station: { station_name: arrivalStation } },
            },
          },
          {
            train_stop: {
              some: { station: { station_name: departureStation } },
            },
          },
          {
            schedule: {
              some: {
                departTime: {
                  gte: startReturn,
                  lte: endReturn,
                },
              },
            },
          },
        ],
      },
      include: {
        train_stop: { include: { station: true } },
        schedule: {
          where: {
            departTime: {
              gte: startReturn,
              lte: endReturn,
            },
          },
        },
      },
    });

    validReturn = returnTrains.filter((train) => {
      const stops = train.train_stop;
      const dStop = stops.find(
        (s) => s.station.station_name === arrivalStation
      );
      const aStop = stops.find(
        (s) => s.station.station_name === departureStation
      );
      return dStop && aStop && aStop.stop_order > dStop.stop_order;
    });
  }

  console.log("validOutbound:", validOutbound);
  const response = NextResponse.json(
    { outbound: validOutbound, return: validReturn },
    { status: 200 }
  );

  response.headers.set(
    "Access-Control-Allow-Origin",
    "https://www.goticket.click"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return response;
}
