import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const prisma = new PrismaClient();

// Hàm format thời gian đặc biệt - BỎ QUA timezone
function formatTrainTimeDisplay(date, isArrival = false, referenceTime = null) {
  if (!date) return "--:--";

  const d = new Date(date);
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  let result = `${hours}:${minutes}`;

  if (isArrival && referenceTime) {
    const refDate = new Date(referenceTime);
    if (d.getUTCDate() !== refDate.getUTCDate() || d < refDate) {
      result += " (+1)";
    }
  }
  return result;
}

function formatDuration(minutes) {
  if (!minutes) return "0 phút";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours > 0 ? hours + " giờ " : ""}${mins} phút`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trainID = searchParams.get("trainID");

  try {
    const trains = await prisma.train.findMany({
      where: trainID ? { trainID: parseInt(trainID) } : {},
      include: {
        schedule: {
          include: { train_recurrence: true },
          orderBy: { departTime: "asc" },
        },
        train_stop: {
          include: { station: true },
          orderBy: { stop_order: "asc" },
        },
      },
    });

    const trainsWithData = await Promise.all(
      trains.map(async (train) => {
        const stops = train.train_stop;
        let totalPrice = 0;
        const segments = [];

        if (stops.length >= 2) {
          const orderedStops = stops.sort(
            (a, b) => a.stop_order - b.stop_order
          );
          for (let i = 0; i < orderedStops.length - 1; i++) {
            const segment = await prisma.route_segment.findFirst({
              where: {
                from_station_id: orderedStops[i].station_id,
                to_station_id: orderedStops[i + 1].station_id,
              },
            });
            if (segment) {
              totalPrice += parseFloat(segment.base_price.toString());
              segments.push({
                from: orderedStops[i].station.station_name,
                to: orderedStops[i + 1].station.station_name,
                from_station_id: orderedStops[i].station_id,
                to_station_id: orderedStops[i + 1].station_id,
                departTime: formatTrainTimeDisplay(
                  orderedStops[i].departure_time
                ),
                arrivalTime: formatTrainTimeDisplay(
                  orderedStops[i + 1].arrival_time,
                  true,
                  orderedStops[i].departure_time
                ),
                price: parseFloat(segment.base_price.toString()),
                duration: segment.duration,
              });
            }
          }
        }

        const schedule = train.schedule[0];
        let duration = 0;
        if (schedule?.departTime && schedule?.arrivalTime) {
          const depart = new Date(schedule.departTime);
          const arrival = new Date(schedule.arrivalTime);
          if (arrival < depart) arrival.setDate(arrival.getDate() + 1);
          duration = Math.round((arrival - depart) / (1000 * 60));
        }

        const availableSeats = await prisma.seattrain.count({
          where: {
            trainID: train.trainID,
            travel_date: schedule?.departTime
              ? new Date(schedule.departTime)
              : undefined,
            is_available: true,
          },
        });

        const firstStop = stops[0];
        const lastStop = stops[stops.length - 1];

        const formatDate = (date) => {
          if (!date) return "N/A";
          return new Date(date).toLocaleDateString("vi-VN");
        };

        return {
          trainID: train.trainID,
          train_name: train.train_name,
          total_seats: train.total_seats,
          available_seats: availableSeats,
          startStation: firstStop?.station?.station_name || "N/A",
          startStationId: firstStop?.station_id || null,
          endStation: lastStop?.station?.station_name || "N/A",
          endStationId: lastStop?.station_id || null,
          departTime: formatTrainTimeDisplay(schedule?.departTime),
          arrivalTime: formatTrainTimeDisplay(
            schedule?.arrivalTime,
            true,
            schedule?.departTime
          ),
          price: totalPrice,
          duration: duration,
          formattedDuration: formatDuration(duration),
          start_date: formatDate(schedule?.train_recurrence?.start_date),
          end_date: formatDate(schedule?.train_recurrence?.end_date),
          days_of_week: schedule?.train_recurrence?.days_of_week || "1111111",
          schedule_id: schedule?.schedule_id || 0,
          recurrence_id: schedule?.recurrence_id || 0,
          status: schedule?.status || "Scheduled",
          segments: segments, // Thêm danh sách segments
          stops: stops.map((stop) => ({
            station_id: stop.station_id,
            stop_order: stop.stop_order,
            arrival_time: formatTrainTimeDisplay(stop.arrival_time),
            departure_time: formatTrainTimeDisplay(stop.departure_time),
            stop_duration: stop.stop_duration,
            station_name: stop.station.station_name,
          })),
        };
      })
    );

    return NextResponse.json(trainID ? trainsWithData[0] : trainsWithData);
  } catch (error) {
    console.error("Error fetching trains:", error);
    return NextResponse.json(
      { error: "Database query failed", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
    console.log("Received request body:", body);

    // Validate required fields
    const requiredFields = [
      "trainID",
      "train_name",
      "total_seats",
      "stops",
      "segments",
      "departTime",
      "arrivalTime",
      "start_date",
      "end_date",
      "days_of_week",
    ];

    const missingFields = requiredFields.filter((field) => {
      if (!body[field]) return true;
      if (
        (field === "stops" || field === "segments") &&
        (!Array.isArray(body[field]) || body[field].length === 0)
      )
        return true;
      return false;
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields", missingFields },
        { status: 400 }
      );
    }

    // Validate stops and segments
    if (body.stops.length < 2) {
      return NextResponse.json(
        { error: "At least 2 stops are required" },
        { status: 400 }
      );
    }
    if (body.segments.length !== body.stops.length - 1) {
      return NextResponse.json(
        {
          error:
            "Number of segments must be exactly one less than number of stops",
        },
        { status: 400 }
      );
    }

    // Validate dates format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.start_date) || !dateRegex.test(body.end_date)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Validate end_date is not before start_date
    if (new Date(body.end_date) < new Date(body.start_date)) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(body.departTime) || !timeRegex.test(body.arrivalTime)) {
      return NextResponse.json(
        { error: "Time must be in HH:MM format (24-hour)" },
        { status: 400 }
      );
    }

    // Validate days_of_week
    if (!/^[01]{7}$/.test(body.days_of_week)) {
      return NextResponse.json(
        { error: "days_of_week must be 7 characters of 0 or 1" },
        { status: 400 }
      );
    }

    // Validate segments data
    for (const segment of body.segments) {
      if (
        !segment.from_station_id ||
        !segment.to_station_id ||
        isNaN(segment.base_price) ||
        segment.base_price < 0 ||
        isNaN(segment.duration) ||
        segment.duration < 0
      ) {
        return NextResponse.json(
          { error: "Invalid segment data: missing or invalid fields" },
          { status: 400 }
        );
      }
    }

    // Validate stops data
    for (const stop of body.stops) {
      if (!stop.station_id || isNaN(stop.stop_order)) {
        return NextResponse.json(
          { error: "Invalid stop data: missing or invalid fields" },
          { status: 400 }
        );
      }
      if (stop.arrival_time && !timeRegex.test(stop.arrival_time)) {
        return NextResponse.json(
          { error: "Stop arrival_time must be in HH:MM format" },
          { status: 400 }
        );
      }
      if (stop.departure_time && !timeRegex.test(stop.departure_time)) {
        return NextResponse.json(
          { error: "Stop departure_time must be in HH:MM format" },
          { status: 400 }
        );
      }
      if (stop.stop_duration !== undefined && stop.stop_duration !== null) {
        const stopDurationValue = Number(stop.stop_duration);
        if (isNaN(stopDurationValue) || stopDurationValue < 0) {
          return NextResponse.json(
            { error: "Stop stop_duration must be a non-negative number" },
            { status: 400 }
          );
        }
      }
    }

    // Validate station_ids exist
    const stationIds = [
      ...body.stops.map((s) => parseInt(s.station_id)),
      ...body.segments.map((s) => parseInt(s.from_station_id)),
      ...body.segments.map((s) => parseInt(s.to_station_id)),
    ];
    const uniqueStationIds = [...new Set(stationIds)];
    const existingStations = await prisma.station.findMany({
      where: { station_id: { in: uniqueStationIds } },
      select: { station_id: true },
    });
    const existingStationIds = existingStations.map((s) => s.station_id);
    const missingStationIds = uniqueStationIds.filter(
      (id) => !existingStationIds.includes(id)
    );
    if (missingStationIds.length > 0) {
      return NextResponse.json(
        { error: "Some station IDs do not exist", missingStationIds },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Check if trainID already exists
      const existingTrain = await prisma.train.findUnique({
        where: { trainID: parseInt(body.trainID) },
      });
      if (existingTrain) {
        throw new Error(`Train with trainID ${body.trainID} already exists`);
      }

      // 1. Create new train
      const train = await prisma.train.create({
        data: {
          trainID: parseInt(body.trainID),
          train_name: body.train_name,
          total_seats: parseInt(body.total_seats),
        },
      });

      // 2. Create train recurrence
      const recurrence = await prisma.train_recurrence.create({
        data: {
          trainID: parseInt(body.trainID),
          start_date: new Date(body.start_date + "T00:00:00Z"),
          end_date: new Date(body.end_date + "T23:59:59Z"),
          days_of_week: body.days_of_week,
        },
      });

      // 3. Create train stops
      await prisma.train_stop.createMany({
        data: body.stops.map((stop, index) => ({
          trainID: parseInt(body.trainID),
          station_id: parseInt(stop.station_id),
          stop_order: index + 1,
          arrival_time: stop.arrival_time
            ? new Date(`${body.start_date}T${stop.arrival_time}:00Z`)
            : null,
          departure_time: stop.departure_time
            ? new Date(`${body.start_date}T${stop.departure_time}:00Z`)
            : null,
          stop_duration: stop.stop_duration ? parseInt(stop.stop_duration) : 0,
        })),
      });

      // 4. Create or update route segments
      await Promise.all(
        body.segments.map((segment) =>
          prisma.route_segment.upsert({
            where: {
              from_station_id_to_station_id: {
                from_station_id: parseInt(segment.from_station_id),
                to_station_id: parseInt(segment.to_station_id),
              },
            },
            update: {
              base_price: parseFloat(segment.base_price),
              duration: parseInt(segment.duration),
            },
            create: {
              from_station_id: parseInt(segment.from_station_id),
              to_station_id: parseInt(segment.to_station_id),
              base_price: parseFloat(segment.base_price),
              duration: parseInt(segment.duration),
            },
          })
        )
      );

      // 5. Create seat templates
      const generateSeatsForCoach = (coach, seatCount, seatType) => {
        const seats = [];
        for (let i = 1; i <= seatCount; i++) {
          const seatNumber = i.toString().padStart(2, "0");
          let floor;
          if (coach.startsWith("C")) {
            const floorCycle = (i - 1) % 4;
            floor = floorCycle < 2 ? 1 : 2;
          } else {
            const floorCycle = (i - 1) % 6;
            floor = floorCycle < 2 ? 1 : floorCycle < 4 ? 2 : 3;
          }
          seats.push({
            coach,
            seat_number: seatNumber,
            seat_type: seatType,
            floor,
          });
        }
        return seats;
      };

      const seatTemplates = [
        ...generateSeatsForCoach("A1", 48, "soft"),
        ...generateSeatsForCoach("A2", 48, "soft"),
        ...generateSeatsForCoach("B1", 48, "hard_sleeper_6"),
        ...generateSeatsForCoach("B2", 48, "hard_sleeper_6"),
        ...generateSeatsForCoach("C1", 32, "hard_sleeper_4"),
        ...generateSeatsForCoach("C2", 32, "hard_sleeper_4"),
      ];

      await prisma.seat_template.createMany({
        data: seatTemplates.map((template) => ({
          trainID: parseInt(body.trainID),
          coach: template.coach,
          seat_number: template.seat_number,
          seat_type: template.seat_type,
          floor: template.floor,
        })),
      });

      return { train, recurrence };
    });

    // 6. Call stored procedure to generate seats
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
      await connection.execute(
        `CALL GenerateSeatsForSchedulePeriod(?, ?, ?, ?, ?)`,
        [
          parseInt(body.trainID),
          body.start_date,
          body.end_date,
          body.departTime,
          body.arrivalTime,
        ]
      );
    } catch (error) {
      throw new Error(`Stored procedure failed: ${error.message}`);
    } finally {
      await connection.end();
    }

    return NextResponse.json({
      success: true,
      trainID: result.train.trainID,
      recurrenceID: result.recurrence.recurrence_id,
      message: "Train created successfully",
    });
  } catch (error) {
    console.error("Error creating train:", error);
    return NextResponse.json(
      {
        error: "Failed to create train",
        details: error.message,
        receivedBody: body || {},
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

    await prisma.$transaction(async (prisma) => {
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
        include: { train_recurrence: true },
      });

      if (schedule) {
        if (updates.days_of_week || updates.start_date || updates.end_date) {
          await prisma.train_recurrence.update({
            where: { recurrence_id: schedule.recurrence_id },
            data: {
              days_of_week: updates.days_of_week,
              start_date: updates.start_date
                ? new Date(updates.start_date + "T00:00:00Z")
                : undefined,
              end_date: updates.end_date
                ? new Date(updates.end_date + "T23:59:59Z")
                : undefined,
            },
          });
        }

        if (updates.departTime || updates.arrivalTime) {
          const scheduleDate = updates.start_date
            ? updates.start_date
            : schedule.train_recurrence.start_date.toISOString().split("T")[0];

          let newDepartTime = null;
          if (updates.departTime) {
            const [hours, minutes] = updates.departTime.split(":");
            newDepartTime = new Date(scheduleDate + "T00:00:00Z");
            newDepartTime.setUTCHours(parseInt(hours));
            newDepartTime.setUTCMinutes(parseInt(minutes));
          }

          let newArrivalTime = null;
          if (updates.arrivalTime) {
            const [hours, minutes] = updates.arrivalTime.split(":");
            newArrivalTime = new Date(scheduleDate + "T00:00:00Z");
            newArrivalTime.setUTCHours(parseInt(hours));
            newArrivalTime.setUTCMinutes(parseInt(minutes));

            if (newDepartTime && newArrivalTime < newDepartTime) {
              newArrivalTime.setDate(newArrivalTime.getDate() + 1);
            }
          }

          await prisma.schedule.update({
            where: { schedule_id: schedule.schedule_id },
            data: {
              departTime: updates.departTime ? newDepartTime : undefined,
              arrivalTime: updates.arrivalTime ? newArrivalTime : undefined,
            },
          });
        }
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
                arrival_time: stop.arrival_time || null,
                departure_time: stop.departure_time || null,
                stop_duration: stop.stop_duration
                  ? parseInt(stop.stop_duration)
                  : 0,
              },
            })
          )
        );
      }

      if (updates.segments) {
        await prisma.route_segment.deleteMany({
          where: {
            OR: [
              {
                from_station_id: {
                  in: updates.segments.map((s) => parseInt(s.from_station_id)),
                },
              },
              {
                to_station_id: {
                  in: updates.segments.map((s) => parseInt(s.to_station_id)),
                },
              },
            ],
          },
        });

        await Promise.all(
          updates.segments.map((segment) =>
            prisma.route_segment.create({
              data: {
                from_station_id: parseInt(segment.from_station_id),
                to_station_id: parseInt(segment.to_station_id),
                duration: parseInt(segment.duration),
                base_price: parseFloat(segment.base_price),
              },
            })
          )
        );
      }
    });

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
        { error: "Mã chuyến tàu (trainID) là bắt buộc" },
        { status: 400 }
      );
    }

    const trainIdNum = parseInt(trainID);

    // Kiểm tra xem tàu có tồn tại hay không
    const train = await prisma.train.findUnique({
      where: { trainID: trainIdNum },
    });

    if (!train) {
      return NextResponse.json(
        { error: `Không tìm thấy chuyến tàu với trainID ${trainID}` },
        { status: 404 }
      );
    }

    await prisma.$transaction(
      async (prisma) => {
        // 1. Xóa tất cả các lịch trình liên quan đến trainID
        await prisma.schedule.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 2. Xóa các train_recurrence liên quan đến trainID
        await prisma.train_recurrence.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 3. Xóa tất cả các bản ghi trong train_stop
        await prisma.train_stop.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 4. Xóa tất cả các bản ghi trong seat_template
        await prisma.seat_template.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 5. Xóa tất cả các bản ghi trong seat_availability_segment
        await prisma.seat_availability_segment.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 6. Xóa tất cả các bản ghi trong seattrain
        await prisma.seattrain.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 7. Xóa các vé (ticket) liên quan
        await prisma.ticket.deleteMany({
          where: { trainID: trainIdNum },
        });

        // 8. Xóa bản ghi trong train
        await prisma.train.delete({
          where: { trainID: trainIdNum },
        });
      },
      { timeout: 10000 } // Tăng timeout lên 10 giây
    );

    return NextResponse.json(
      { message: `Chuyến tàu với trainID ${trainID} đã được xóa thành công` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lỗi khi xóa chuyến tàu:", error);
    return NextResponse.json(
      { error: "Không thể xóa chuyến tàu", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
