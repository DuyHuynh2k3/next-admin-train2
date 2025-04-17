// src/app/api/trains/route.js
// src/app/api/trains/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

function formatTime(timeString) {
  if (typeof timeString === "string") {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  return timeString;
}

// API endpoint mới để lấy chi tiết các chặng
export async function GET_SEGMENTS(request) {
  const { searchParams } = new URL(request.url);
  const trainID = searchParams.get("trainID");

  try {
    const segments = await prisma.$queryRaw`
      SELECT 
        rs.segment_id,
        t.trainID AS train_id,
        t.train_name,
        st1.station_name AS from_station,
        st2.station_name AS to_station,
        rs.base_price AS current_price,
        TIME(ts1.departure_time) AS depart_time,
        TIME(ts2.arrival_time) AS arrival_time,
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

    return NextResponse.json(segments, { status: 200 });
  } catch (error) {
    console.error("Error fetching segments:", error);
    return NextResponse.json(
      { error: "Database query failed", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// API endpoint mới để cập nhật giá vé chặng
export async function PUT_SEGMENT_PRICE(request) {
  try {
    const { segment_id, new_price } = await request.json();

    if (!segment_id || !new_price) {
      return NextResponse.json(
        { error: "Segment ID and new price are required" },
        { status: 400 }
      );
    }

    await prisma.route_segment.update({
      where: { segment_id: parseInt(segment_id) },
      data: { base_price: parseFloat(new_price) },
    });

    return NextResponse.json(
      { message: "Segment price updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating segment price:", error);
    return NextResponse.json(
      { error: "Failed to update segment price", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trainID = searchParams.get("trainID");

  try {
    // Lấy danh sách tàu với các thông tin liên quan
    const trains = await prisma.train.findMany({
      where: trainID ? { trainID: parseInt(trainID) } : {},
      include: {
        schedule: {
          include: {
            train_recurrence: true,
          },
          orderBy: {
            departTime: "asc",
          },
        },
        train_stop: {
          include: {
            station: true,
          },
          orderBy: {
            stop_order: "asc",
          },
        },
      },
    });

    // Tính toán giá vé cho từng tàu
    const trainsWithPrices = await Promise.all(
      trains.map(async (train) => {
        const stops = train.train_stop;
        if (stops.length < 2) {
          return {
            ...train,
            price: 0,
          };
        }

        const orderedStops = stops.sort((a, b) => a.stop_order - b.stop_order);
        let totalPrice = 0;

        for (let i = 0; i < orderedStops.length - 1; i++) {
          const currentStop = orderedStops[i];
          const nextStop = orderedStops[i + 1];

          const segment = await prisma.route_segment.findFirst({
            where: {
              from_station_id: currentStop.station_id,
              to_station_id: nextStop.station_id,
            },
          });

          if (segment) {
            totalPrice += parseFloat(segment.base_price.toString());
          }
        }

        return {
          ...train,
          price: totalPrice,
        };
      })
    );

    // Format dữ liệu trả về
    const formattedTrains = trainsWithPrices.map((train) => {
      const schedule = train.schedule[0];
      const stops = train.train_stop;
      const firstStop = stops[0];
      const lastStop = stops[stops.length - 1];

      let duration = 0;
      if (schedule?.departTime && schedule?.arrivalTime) {
        duration = Math.round(
          (new Date(schedule.arrivalTime) - new Date(schedule.departTime)) /
            (1000 * 60)
        );
      }

      const formatTime = (date) => {
        if (!date) return "--:-- --";
        const d = new Date(date);
        return d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      };

      const formatDate = (date) => {
        if (!date) return "N/A";
        const d = new Date(date);
        return d.toLocaleDateString("vi-VN");
      };

      return {
        trainID: train.trainID,
        train_name: train.train_name,
        total_seats: train.total_seats,
        startStation: firstStop?.station?.station_name || "N/A",
        startStationId: firstStop?.station_id || null,
        endStation: lastStop?.station?.station_name || "N/A",
        endStationId: lastStop?.station_id || null,
        departTime: formatTime(schedule?.departTime),
        arrivalTime: formatTime(schedule?.arrivalTime),
        price: train.price || 0,
        duration: duration,
        start_date: formatDate(schedule?.train_recurrence?.start_date),
        end_date: formatDate(schedule?.train_recurrence?.end_date),
        days_of_week: schedule?.train_recurrence?.days_of_week || "1111111",
        schedule_id: schedule?.schedule_id || 0,
        recurrence_id: schedule?.recurrence_id || 0,
        status: schedule?.status || "Scheduled",
      };
    });

    return NextResponse.json(trainID ? formattedTrains[0] : formattedTrains, {
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching trains:", error);
    return NextResponse.json(
      {
        error: "Database query failed",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const requiredFields = [
      "trainID",
      "train_name",
      "total_seats",
      "stops",
      "departTime",
      "arrivalTime",
      "start_date",
      "end_date",
      "days_of_week",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
        },
        { status: 400 }
      );
    }

    const train = await prisma.train.create({
      data: {
        trainID: parseInt(body.trainID),
        train_name: body.train_name,
        total_seats: parseInt(body.total_seats),
      },
    });

    const recurrence = await prisma.train_recurrence.create({
      data: {
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
        days_of_week: body.days_of_week,
      },
    });

    const schedule = await prisma.schedule.create({
      data: {
        trainID: parseInt(body.trainID),
        recurrence_id: recurrence.recurrence_id,
        departTime: formatTime(body.departTime),
        arrivalTime: formatTime(body.arrivalTime),
      },
    });

    await Promise.all(
      body.stops.map((stop, index) =>
        prisma.train_stop.create({
          data: {
            trainID: parseInt(body.trainID),
            station_id: parseInt(stop.station_id),
            stop_order: index + 1,
            arrival_time: formatTime(stop.arrival_time),
            departure_time: formatTime(stop.departure_time),
            stop_duration: stop.stop_duration || 0,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      trainID: train.trainID,
      scheduleID: schedule.schedule_id,
      message: "Train created successfully",
    });
  } catch (error) {
    console.error("Error creating train:", error);
    return NextResponse.json(
      {
        error: "Failed to create train",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request) {
  try {
    const { trainID, ...updates } = await request.json();

    if (!trainID) {
      return NextResponse.json(
        { error: "Train ID is required" },
        { status: 400 }
      );
    }

    if (updates.train_name || updates.total_seats) {
      await prisma.train.update({
        where: { trainID: parseInt(trainID) },
        data: {
          train_name: updates.train_name,
          total_seats: updates.total_seats
            ? parseInt(updates.total_seats)
            : undefined,
        },
      });
    }

    const schedule = await prisma.schedule.findFirst({
      where: { trainID: parseInt(trainID) },
    });

    if (schedule) {
      if (updates.days_of_week || updates.start_date || updates.end_date) {
        await prisma.train_recurrence.update({
          where: { recurrence_id: schedule.recurrence_id },
          data: {
            days_of_week: updates.days_of_week,
            start_date: updates.start_date
              ? new Date(updates.start_date)
              : undefined,
            end_date: updates.end_date ? new Date(updates.end_date) : undefined,
          },
        });
      }

      if (updates.departTime || updates.arrivalTime) {
        await prisma.schedule.update({
          where: { schedule_id: schedule.schedule_id },
          data: {
            departTime: updates.departTime
              ? formatTime(updates.departTime)
              : undefined,
            arrivalTime: updates.arrivalTime
              ? formatTime(updates.arrivalTime)
              : undefined,
          },
        });
      }

      if (updates.stops) {
        await prisma.train_stop.deleteMany({
          where: { trainID: parseInt(trainID) },
        });

        await Promise.all(
          updates.stops.map((stop, index) =>
            prisma.train_stop.create({
              data: {
                trainID: parseInt(trainID),
                station_id: parseInt(stop.station_id),
                stop_order: index + 1,
                arrival_time: formatTime(stop.arrival_time),
                departure_time: formatTime(stop.departure_time),
                stop_duration: stop.stop_duration || 0,
              },
            })
          )
        );
      }
    }

    return NextResponse.json(
      { message: "Train information updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating train:", error);
    return NextResponse.json(
      { error: "Failed to update train", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = searchParams.get("trainID");

    if (!trainID) {
      return NextResponse.json(
        { error: "Train ID is required" },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.findFirst({
      where: { trainID: parseInt(trainID) },
    });

    if (schedule) {
      await prisma.schedule.delete({
        where: { schedule_id: schedule.schedule_id },
      });

      await prisma.train_recurrence.delete({
        where: { recurrence_id: schedule.recurrence_id },
      });
    }

    await prisma.train_stop.deleteMany({
      where: { trainID: parseInt(trainID) },
    });

    await prisma.seat_template.deleteMany({
      where: { trainID: parseInt(trainID) },
    });

    await prisma.seatrain.deleteMany({
      where: { trainID: parseInt(trainID) },
    });

    await prisma.train.delete({
      where: { trainID: parseInt(trainID) },
    });

    return NextResponse.json(
      { message: "Train deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting train:", error);
    return NextResponse.json(
      { error: "Failed to delete train", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}