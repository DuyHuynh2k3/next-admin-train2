import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const passengerTypeEnum = {
  0: "Adult",
  1: "Child",
  2: "Senior",
  3: "Student",
};

const prisma = new PrismaClient();

// Khởi tạo Redis client
let redisClient;
async function initRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        tls: process.env.REDIS_URL?.startsWith("rediss://"),
        connectTimeout: 5000,
        reconnectStrategy: (retries) =>
          retries > 3
            ? new Error("Hết lần thử kết nối Redis")
            : Math.min(retries * 1000, 3000),
      },
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });
    redisClient.on("error", (err) => console.error("Redis Client Error:", err));
    redisClient.on("connect", () => console.log("Kết nối Redis thành công"));
    redisClient.on("end", () => console.log("Mất kết nối Redis"));
    await redisClient.connect();
  }
  return redisClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const parseUTCTime = (dateStr, timeStr) => {
  const [hours, minutes, seconds = "00"] = timeStr.split(":");
  const date = new Date(dateStr);
  date.setUTCHours(parseInt(hours));
  date.setUTCMinutes(parseInt(minutes));
  date.setUTCSeconds(parseInt(seconds));
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

export async function POST(request) {
  let transaction;
  try {
    const {
      customerData,
      ticketDataList,
      paymentData,
      sendEmail = true,
    } = await request.json();
    console.log("Received sendEmail:", sendEmail);

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

      const booking = await prisma.booking.create({
        data: {
          customer_passport: customer.passport,
          email: customerData.email,
          phoneNumber: customerData.phoneNumber,
          fullName: customerData.fullName,
        },
      });

      const createdTickets = [];
      const redisClient = await initRedis();

      for (const ticketData of ticketDataList) {
        if (ticketData.passport && ticketData.passport !== customer.passport) {
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

        // Tìm seatID từ coach_seat nếu không có seatID
        let seatID = ticketData.seatID;
        if (!seatID && ticketData.coach_seat) {
          const [coach, seat_number] = ticketData.coach_seat.split("-");
          const seat = await prisma.seattrain.findFirst({
            where: {
              trainID: ticketData.trainID,
              travel_date: new Date(ticketData.travel_date),
              coach,
              seat_number,
              seat_type: ticketData.seatType,
            },
            select: { seatID: true },
          });

          if (!seat) {
            throw new Error(
              `Seat ${ticketData.coach_seat} not found for trainID ${ticketData.trainID} on ${ticketData.travel_date}`
            );
          }
          seatID = seat.seatID;
        }

        if (!seatID) {
          throw new Error("seatID or coach_seat is required");
        }

        // Kiểm tra ghế đã được đặt chưa
        const existingTicket = await prisma.ticket.findFirst({
          where: {
            seatID: seatID,
            trainID: ticketData.trainID,
            travel_date: new Date(ticketData.travel_date),
            from_station_id: ticketData.from_station_id,
            to_station_id: ticketData.to_station_id,
          },
        });
        if (existingTicket) {
          throw new Error(
            `Seat ${ticketData.coach_seat} already booked for this journey`
          );
        }

        const ticketCreateData = {
          booking: {
            connect: { booking_id: booking.booking_id },
          },
          fullName: ticketData.fullName,
          phoneNumber: ticketData.phoneNumber,
          email: ticketData.email,
          seatType: ticketData.seatType,
          qr_code:
            ticketData.qr_code ||
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
          seattrain: { connect: { seatID: seatID } },
        };

        if (ticketData.passport) {
          ticketCreateData.customer = {
            connect: { passport: ticketData.passport },
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

        // Cập nhật seattrain.is_available = false
        await prisma.seattrain.update({
          where: { seatID: seatID },
          data: { is_available: false },
        });

        // Cập nhật hoặc tạo seat_availability_segment
        await prisma.seat_availability_segment.upsert({
          where: {
            seatID_trainID_travel_date_from_station_id_to_station_id: {
              seatID: seatID,
              trainID: ticketData.trainID,
              travel_date: new Date(ticketData.travel_date),
              from_station_id: ticketData.from_station_id,
              to_station_id: ticketData.to_station_id,
            },
          },
          update: {
            is_available: false,
          },
          create: {
            seatID: seatID,
            trainID: ticketData.trainID,
            travel_date: new Date(ticketData.travel_date),
            from_station_id: ticketData.from_station_id,
            to_station_id: ticketData.to_station_id,
            is_available: false,
          },
        });

        // Xóa cache Redis
        const cacheKey = `seats:${ticketData.trainID}:${ticketData.travel_date}:${ticketData.from_station_id}:${ticketData.to_station_id}`;
        try {
          await redisClient.del(cacheKey);
          console.log(`Cleared cache for key: ${cacheKey}`);
        } catch (redisError) {
          console.warn(
            `Failed to clear cache for key ${cacheKey}:`,
            redisError.message
          );
        }

        if (paymentData) {
          await prisma.payment_ticket.create({
            data: {
              ticket_id: ticket.ticket_id,
              payment_method: paymentData.payment_method,
              payment_amount: paymentData.payment_amount || ticketData.price,
              payment_status: paymentData.payment_status || "Pending",
              payment_date: new Date(paymentData.payment_date || Date.now()),
            },
          });
        }
      }

      if (sendEmail) {
        console.log("Calling sendBookingEmail for email:", customerData.email);
        await sendBookingEmail(createdTickets, booking, customerData.email);
      } else {
        console.log("Skipping sendBookingEmail due to sendEmail: false");
      }

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
      raw: error,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
