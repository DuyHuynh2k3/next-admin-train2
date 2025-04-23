import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getStationSegments } from "../../../lib/seatUtils"; // Cập nhật đường dẫn import

const prisma = new PrismaClient();

// Hàm tính hệ số nhân dựa trên seat_type
const getSeatTypeMultiplier = (seatType) => {
  switch (seatType) {
    case "soft":
      return 1.0;
    case "hard_sleeper_6":
      return 1.1;
    case "hard_sleeper_4":
      return 1.2;
    default:
      return 1.0;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = parseInt(searchParams.get("trainID"));
    const travelDate = searchParams.get("travel_date");
    const fromStationID = parseInt(searchParams.get("from_station_id"));
    const toStationID = parseInt(searchParams.get("to_station_id"));

    console.log("trainID:", trainID);
    console.log("travelDate:", travelDate);

    if (!trainID || !travelDate || !fromStationID || !toStationID) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const dateStart = new Date(travelDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    console.log("Converted Date:", dateStart);

    const seats = await prisma.seattrain.findMany({
      where: {
        trainID: trainID,
        travel_date: dateStart,
      },
    });

    console.log("Seats Before Availability for trainID", trainID, ":", seats);

    if (seats.length === 0) {
      return NextResponse.json(
        { error: "No seats found for this train on the specified date" },
        { status: 404 }
      );
    }

    const seatIDs = seats.map((seat) => seat.seatID);

    const segments = await getStationSegments(
      trainID,
      fromStationID,
      toStationID
    );
    const segmentsToSum = segments.map((segment) => ({
      from: parseInt(segment.from_station_id),
      to: parseInt(segment.to_station_id),
    }));

    if (segmentsToSum.length === 0) {
      return NextResponse.json(
        { error: "No route segments found between the stations" },
        { status: 400 }
      );
    }

    const availabilitySegments = [];
    for (const segment of segmentsToSum) {
      const segmentAvailability =
        await prisma.seat_availability_segment.findMany({
          where: {
            seatID: { in: seatIDs },
            trainID: trainID,
            travel_date: dateStart,
            from_station_id: segment.from,
            to_station_id: segment.to,
            is_available: true,
          },
        });
      availabilitySegments.push(...segmentAvailability);
    }

    console.log(
      "Availability Segments for trainID",
      trainID,
      ":",
      availabilitySegments
    );

    const seatsWithAvailability = seats.map((seat) => {
      const seatAvailability = availabilitySegments.filter(
        (avail) => avail.seatID === seat.seatID
      );
      return {
        ...seat,
        seat_availability_segment: seatAvailability,
      };
    });

    console.log(
      "Seats With Availability for trainID",
      trainID,
      ":",
      seatsWithAvailability
    );

    const availableSeats = seatsWithAvailability.filter((seat) => {
      const availabilitySegments = seat.seat_availability_segment;
      return segmentsToSum.every((segment) =>
        availabilitySegments.some(
          (avail) =>
            avail.from_station_id === segment.from &&
            avail.to_station_id === segment.to &&
            avail.is_available
        )
      );
    });

    console.log(
      "Available Seats After Filter for trainID",
      trainID,
      ":",
      availableSeats
    );

    // Tính tổng base_price từ route_segment
    let totalBasePrice = 0;
    for (const segment of segmentsToSum) {
      const routeSegment = await prisma.route_segment.findFirst({
        where: {
          from_station_id: segment.from,
          to_station_id: segment.to,
        },
      });

      if (!routeSegment) {
        return NextResponse.json(
          {
            error: `No route segment found between stations ${segment.from} and ${segment.to}`,
          },
          { status: 400 }
        );
      }

      totalBasePrice += parseFloat(routeSegment.base_price);
    }

    console.log("Total Base Price for segments:", totalBasePrice);

    // Nhóm ghế theo seat_type và coach
    const seatMap = {};
    availableSeats.forEach((seat) => {
      const seat_type = seat.seat_type;
      const coach = seat.coach;

      if (!seatMap[seat_type]) {
        seatMap[seat_type] = {};
      }
      if (!seatMap[seat_type][coach]) {
        seatMap[seat_type][coach] = [];
      }
      seatMap[seat_type][coach].push({
        seat_number: seat.seat_number,
        is_available: true,
      });
    });

    // Tính giá vé cho từng seat_type
    const formattedResult = Object.keys(seatMap).map((seat_type) => {
      const coaches = seatMap[seat_type] || {};
      const coachKeys = Object.keys(coaches);
      const totalAvailable = coachKeys.reduce(
        (sum, coach) => sum + (coaches[coach]?.length || 0),
        0
      );

      const multiplier = getSeatTypeMultiplier(seat_type);
      const price = totalBasePrice * multiplier;

      return {
        seat_type,
        available: totalAvailable,
        price: parseFloat(price.toFixed(2)),
        coaches: coachKeys.map((coach) => ({
          coach,
          seat_numbers: coaches[coach] || [],
        })),
      };
    });

    console.log("Formatted Result for trainID", trainID, ":", formattedResult);

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error fetching seats:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
