import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient();

// Khởi tạo Redis client
let redisClient;
async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    await redisClient.connect();
    console.log("Kết nối Redis thành công");
  }
  return redisClient;
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.goticket.click",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const passengerTypeEnum = {
  0: "Adult",
  1: "Child",
  2: "Senior",
  3: "Student",
};

const parseUTCTime = (dateStr, timeStr) => {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date(dateStr);
  date.setUTCHours(parseInt(hours));
  date.setUTCMinutes(parseInt(minutes));
  return date;
};

async function sendBookingEmail(tickets, booking, email) {
  try {
    let htmlContent = `
      <h1>Xác nhận đặt vé tàu</h1>
      <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
      <h3>Thông tin đặt vé (Mã đặt: ${booking.booking_id}):</h3>
      <ul>
    `;
    tickets.forEach((ticket) => {
      const ticketId = ticket.ticket_id;
      const fullName = ticket.fullName || "Không có";
      const passport = ticket.passport || "Không có";
      const phoneNumber = ticket.phoneNumber || "Không có";
      const passengerType = ticket.passenger_type || "Không có";
      const travelDateFormatted = ticket.travel_date
        .toISOString()
        .split("T")[0];
      const fromStation =
        ticket.station_ticket_from_station_idTostation.station_name;
      const toStation =
        ticket.station_ticket_to_station_idTostation.station_name;
      const trainName = ticket.train.train_name;
      const departTime = ticket.departTime
        .toISOString()
        .split("T")[1]
        .slice(0, 5);
      const arrivalTime = ticket.arrivalTime
        .toISOString()
        .split("T")[1]
        .slice(0, 5);
      const price = ticket.price.toString();
      const seatType = ticket.seatType || "Không có";
      const coachSeat = ticket.coach_seat || "Không có";
      const qrCodeUrl = ticket.qr_code_url || "Không có";

      console.log("Mã vé:", ticketId);
      console.log("Họ tên:", fullName);

      htmlContent += `
        <li>
          <p><strong>Mã vé:</strong> ${ticketId}</p>
          <p><strong>Họ tên hành khách:</strong> ${fullName}</p>
          <p><strong>Số CMND/Hộ chiếu:</strong> ${passport}</p>
          <p><strong>Số điện thoại:</strong> ${phoneNumber}</p>
          <p><strong>Đối tượng:</strong> ${passengerType}</p>
          <p><strong>Ngày đi:</strong> ${travelDateFormatted}</p>
          <p><strong>Ga đi:</strong> ${fromStation}</p>
          <p><strong>Ga đến:</strong> ${toStation}</p>
          <p><strong>Tên tàu:</strong> ${trainName}</p>
          <p><strong>Giờ khởi hành:</strong> ${departTime}</p>
          <p><strong>Giờ đến:</strong> ${arrivalTime}</p>
          <p><strong>Loại ghế:</strong> ${seatType}</p>
          <p><strong>Vị trí ghế:</strong> ${coachSeat}</p>
          <p><strong>Giá vé:</strong> ${price} VND</p>
          ${
            qrCodeUrl !== "Không có"
              ? `<p><img src="${qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px;"></p>`
              : ""
          }
        </li>
      `;
    });
    htmlContent += `</ul>`;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.EMAIL_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "no-reply@yourcompany.com",
          email: "deathgunvn2003@gmail.com",
        },
        to: [{ email }],
        subject: "Xác nhận đặt vé tàu thành công",
        htmlContent,
      }),
    });

    const responseData = await response.json();
    console.log("Phản hồi từ Brevo:", response.status, responseData);

    if (!response.ok) {
      console.error("Lỗi từ Brevo API:", responseData);
      throw new Error(responseData.message || "Gửi email thất bại");
    }

    console.log("Email gửi thành công:", responseData);
  } catch (error) {
    console.error("Lỗi khi gửi email:", error.message, error.stack);
    throw error;
  }
}

async function lockSeat(seatID, coachSeat, trainID, travelDate, ttl = 300) {
  const lockKey = `lock:seat:${trainID}:${travelDate}:${seatID || coachSeat}`;
  const client = await initRedis();
  const acquired = await client.set(lockKey, "locked", {
    NX: true,
    EX: ttl,
  });
  return acquired ? lockKey : null;
}

async function releaseSeat(lockKey) {
  const client = await initRedis();
  await client.del(lockKey);
}

export async function POST(request) {
  let transaction;
  let redisClient;
  try {
    redisClient = await initRedis();
    const { customerData, ticketDataList, paymentData } = await request.json();

    console.log("Received customerData.passport:", customerData.passport);
    ticketDataList.forEach((ticketData, index) => {
      console.log(
        `Received ticketData[${index}].passport:`,
        ticketData.passport
      );
    });

    if (!customerData?.passport || !ticketDataList?.length) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Thông tin người đặt và vé là bắt buộc",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    transaction = await prisma.$transaction(async (prisma) => {
      // 1. Create or update customer
      const customer = await prisma.customer.upsert({
        where: { passport: customerData.passport },
        update: {
          fullName: customerData.fullName,
          email: customerData.email,
          phoneNumber: customerData.phoneNumber,
        },
        create: {
          passport: customerData.passport,
          fullName: customerData.fullName,
          email: customerData.email,
          phoneNumber: customerData.phoneNumber,
        },
      });

      // 2. Create booking
      const booking = await prisma.booking.create({
        data: {
          customer_passport: customer.passport,
          email: customerData.email,
          phoneNumber: customerData.phoneNumber,
          fullName: customerData.fullName,
        },
      });

      // 3. Create tickets
      const createdTickets = [];
      const cacheKeysToDelete = new Set();
      for (const ticketData of ticketDataList) {
        // Khóa ghế
        const lockKey = await lockSeat(
          ticketData.seatID,
          ticketData.coach_seat,
          ticketData.trainID,
          ticketData.travel_date
        );
        if (!lockKey) {
          throw new Error(
            `Ghế ${ticketData.coach_seat} đã được đặt bởi người khác`
          );
        }

        try {
          // Kiểm tra ghế trước khi đặt
          if (ticketData.seatID) {
            const seat = await prisma.seattrain.findUnique({
              where: { seatID: ticketData.seatID },
              select: { is_available: true },
            });
            if (!seat || !seat.is_available) {
              throw new Error(`Ghế seatID=${ticketData.seatID} không khả dụng`);
            }
          } else if (ticketData.coach_seat) {
            const [coach, seat_number] = ticketData.coach_seat.split("-");
            const seat = await prisma.seattrain.findFirst({
              where: {
                trainID: ticketData.trainID,
                coach,
                seat_number,
                seat_type: ticketData.seatType,
                travel_date: new Date(ticketData.travel_date),
              },
              select: { seatID: true, is_available: true },
            });
            if (!seat || !seat.is_available) {
              throw new Error(`Ghế ${ticketData.coach_seat} không khả dụng`);
            }
            ticketData.seatID = seat.seatID; // Gán seatID
          }

          // Kiểm tra và tạo customer cho ticketData.passport nếu cần
          if (
            ticketData.passport &&
            ticketData.passport !== customer.passport
          ) {
            console.log(
              `Passport trong ticketData (${ticketData.passport}) không khớp với customer.passport (${customer.passport}). Tạo customer mới...`
            );
            await prisma.customer.upsert({
              where: { passport: ticketData.passport },
              update: {
                fullName: ticketData.fullName || customer.fullName,
                email: ticketData.email || customer.email,
                phoneNumber: ticketData.phoneNumber || customer.phoneNumber,
              },
              create: {
                passport: ticketData.passport,
                fullName: ticketData.fullName || customer.fullName,
                email: ticketData.email || customer.email,
                phoneNumber: ticketData.phoneNumber || customer.phoneNumber,
              },
            });
          }

          const ticketCreateData = {
            booking: {
              connect: { booking_id: booking.booking_id },
            },
            fullName: ticketData.fullName,
            phoneNumber: ticketData.phoneNumber,
            email: ticketData.email,
            seatType: ticketData.seatType,
            q_code:
              ticketData.q_code ||
              `QR_${Math.random().toString(36).substr(2, 9)}`,
            coach_seat: ticketData.coach_seat,
            travel_date: new Date(ticketData.travel_date || Date.now()),
            departTime: ticketData.departTime
              ? parseUTCTime(ticketData.travel_date, ticketData.departTime)
              : new Date(`${ticketData.travel_date}T00:00:00Z`),
            arrivalTime: ticketData.arrivalTime
              ? parseUTCTime(ticketData.travel_date, ticketData.arrivalTime)
              : new Date(`${ticketData.travel_date}T00:00:00Z`),
            price: ticketData.price || 0,
            payment_status:
              paymentData.payment_status === "Success" ? "Paid" : "Pending",
            refund_status: "None",
            tripType: ticketData.tripType || "oneway",
            passenger_type:
              passengerTypeEnum[parseInt(ticketData.passenger_type)] || "Adult",
            journey_segments: ticketData.journey_segments || JSON.stringify([]),
            train: { connect: { trainID: ticketData.trainID } },
            station_ticket_from_station_idTostation: {
              connect: { station_id: ticketData.from_station_id },
            },
            station_ticket_to_station_idTostation: {
              connect: { station_id: ticketData.to_station_id },
            },
          };

          if (ticketData.passport) {
            ticketCreateData.customer = {
              connect: { passport: ticketData.passport },
            };
          }

          if (ticketData.seatID) {
            ticketCreateData.seattrain = {
              connect: { seatID: ticketData.seatID },
            };
          }

          const ticket = await prisma.ticket.create({
            data: ticketCreateData,
            include: {
              station_ticket_from_station_idTostation: {
                select: { station_name: true },
              },
              station_ticket_to_station_idTostation: {
                select: { station_name: true },
              },
              train: { select: { train_name: true } },
            },
          });

          createdTickets.push(ticket);

          // Cập nhật trạng thái ghế
          console.log(
            `Cập nhật ghế ${
              ticketData.coach_seat || ticketData.seatID
            } cho trainID=${ticketData.trainID}`
          );
          if (ticketData.seatID) {
            await prisma.seattrain.update({
              where: { seatID: ticketData.seatID },
              data: { is_available: false },
            });
          } else if (
            !ticketData.seatID &&
            ticketData.trainID &&
            ticketData.coach_seat
          ) {
            const [coach, seat_number] = ticketData.coach_seat.split("-");
            await prisma.seattrain.updateMany({
              where: {
                trainID: ticketData.trainID,
                coach,
                seat_number,
                seat_type: ticketData.seatType,
                travel_date: new Date(ticketData.travel_date),
              },
              data: { is_available: false },
            });
          }
          console.log(
            `Đã cập nhật trạng thái ghế ${
              ticketData.coach_seat || ticketData.seatID
            } thành không khả dụng`
          );

          // Thêm cache key để xóa
          const cacheKey = `seats:${ticketData.trainID}:${ticketData.travel_date}:${ticketData.from_station_id}:${ticketData.to_station_id}`;
          cacheKeysToDelete.add(cacheKey);
        } finally {
          await releaseSeat(lockKey);
        }
      }

      // Xóa cache Redis
      for (const cacheKey of cacheKeysToDelete) {
        try {
          await redisClient.del(cacheKey);
          console.log(`Xóa cache: ${cacheKey}`);
        } catch (redisError) {
          console.warn(`Không thể xóa cache ${cacheKey}:`, redisError.message);
        }
      }

      // Tạo thanh toán
      if (paymentData) {
        for (const ticket of createdTickets) {
          await prisma.payment_ticket.create({
            data: {
              ticket_id: ticket.ticket_id,
              payment_method: paymentData.payment_method,
              payment_amount: paymentData.payment_amount || ticket.price,
              payment_status: paymentData.payment_status || "Pending",
              payment_date: new Date(paymentData.payment_date || Date.now()),
            },
          });
        }
      }

      // Gửi email xác nhận
      console.log("Calling sendBookingEmail for email:", customerData.email);
      await sendBookingEmail(createdTickets, booking, customerData.email);

      return {
        booking,
        tickets: createdTickets,
      };
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        booking_id: transaction.booking.booking_id,
        ticket_ids: transaction.tickets.map((t) => t.ticket_id),
        email: customerData.email,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error saving booking:", {
      message: error.message,
      stack: error.stack,
    });
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Lỗi hệ thống",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trainID = parseInt(searchParams.get("trainID"));
    const travelDate = searchParams.get("travel_date");
    const fromStationID = parseInt(searchParams.get("from_station_id"));
    const toStationID = parseInt(searchParams.get("to_station_id"));

    console.log("GET Request Params:", {
      trainID,
      travelDate,
      fromStationID,
      toStationID,
    });

    if (!trainID || !travelDate || !fromStationID || !toStationID) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const dateStart = new Date(travelDate);
    dateStart.setUTCHours(0, 0, 0, 0);

    // Kiểm tra cache
    let client;
    try {
      client = await initRedis();
      const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
      const cached = await client.get(cacheKey);
      if (cached) {
        console.log("Cache hit for key:", cacheKey);
        return new NextResponse(cached, {
          status: 200,
          headers: corsHeaders,
        });
      }
      console.log("Cache miss for key:", cacheKey);
    } catch (redisError) {
      console.warn("Redis unavailable, skipping cache:", redisError.message);
    }

    // Lấy danh sách ghế
    const seats = await prisma.seattrain.findMany({
      where: {
        trainID: trainID,
        travel_date: dateStart,
        is_available: true,
      },
      select: {
        seatID: true,
        seat_type: true,
        coach: true,
        seat_number: true,
        is_available: true,
      },
    });

    console.log("Available Seats for trainID", trainID, ":", seats);

    if (seats.length === 0) {
      console.warn(
        `No available seats for trainID=${trainID}, travel_date=${travelDate}`
      );
    }

    // Nhóm ghế theo seat_type và coach
    const seatMap = {};
    seats.forEach((seat) => {
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
        is_available: seat.is_available,
      });
    });

    const result = Object.keys(seatMap).map((seat_type) => {
      const coaches = seatMap[seat_type];
      const coachKeys = Object.keys(coaches);
      const totalAvailable = coachKeys.reduce(
        (sum, coach) =>
          sum + coaches[coach].filter((s) => s.is_available).length,
        0
      );
      return {
        seat_type,
        available: totalAvailable,
        coaches: coachKeys.map((coach) => ({
          coach,
          seat_numbers: coaches[coach],
        })),
      };
    });

    console.log("Formatted Result for trainID", trainID, ":", result);

    // Lưu vào cache
    if (client) {
      try {
        const cacheKey = `seats:${trainID}:${travelDate}:${fromStationID}:${toStationID}`;
        await client.setEx(cacheKey, 600, JSON.stringify(result));
        console.log("Cached result for key:", cacheKey);
      } catch (redisError) {
        console.warn("Failed to cache result:", redisError.message);
      }
    }

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching seats:", {
      message: error.message,
      stack: error.stack,
    });
    return new NextResponse(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
