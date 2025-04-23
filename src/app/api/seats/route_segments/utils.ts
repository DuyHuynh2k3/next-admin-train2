// src/app/api/seats/route_segments/utils.ts
import { PrismaClient } from "@prisma/client";
import { GetStationSegments, StationSegment } from "./type";

const prisma = new PrismaClient();

export const getStationSegments: GetStationSegments = async (
  trainID: number,
  fromStationId: number,
  toStationId: number
) => {
  try {
    const allStops = await prisma.train_stop.findMany({
      where: {
        trainID: trainID,
      },
      orderBy: {
        stop_order: "asc",
      },
      include: {
        station: true,
      },
    });

    const fromIndex = allStops.findIndex(
      (stop) => stop.station_id === fromStationId
    );
    const toIndex = allStops.findIndex(
      (stop) => stop.station_id === toStationId
    );

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return [];
    }

    const segments: StationSegment[] = [];
    for (let i = fromIndex; i < toIndex; i++) {
      segments.push({
        from_station_id: allStops[i].station_id,
        to_station_id: allStops[i + 1].station_id,
      });
    }

    return segments;
  } catch (error) {
    console.error(
      "Lỗi khi lấy đoạn ga: ",
      error instanceof Error ? error.message : "Lỗi không xác định"
    );
    return [];
  } finally {
    await prisma.$disconnect();
  }
};
