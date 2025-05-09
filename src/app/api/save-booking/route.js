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

// Initialize Redis client
let redisClient;
async function initRedis() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          tls: process.env.REDIS_URL?.startsWith("rediss://"),
          connectTimeout: 5000,
          reconnectStrategy: (retries) =>
            retries > 3
              ? new Error("Max Redis retries reached")
              : Math.min(retries * 1000, 3000),
        },
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });
      redisClient.on("error", (err) =>
        console.error("Redis Client Error:", err)
      );
      redisClient.on("connect", () => console.log("Redis connected"));
      redisClient.on("end", () => console.log("Redis disconnected"));
      await redisClient.connect();
    } catch (error) {
      console.warn("Failed to connect to Redis:", error.message);
      return null;
    }
  }
  return redisClient;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://www.goticket.click",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const parseUTCTime = (dateStr, timeStr) => {
  try {
    const [hours, minutes, secondsPart = "00"] = timeStr.split(":");
    const seconds = secondsPart.split(".")[0]; // Handle milliseconds (e.g., "00.000")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    date.setUTCHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
    return date;
  } catch (error) {
    console.error("Error parsing UTC time:", error.message);
    throw error;
  }
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

      console.log("Mã vé:", ticketId, "Họ tên:", fullName);

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
    console.log("Brevo response:", response.status, responseData);

    if (!response.ok) {
      console.error("Brevo API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", responseData);
  } catch (error) {
    console.error("Error sending email:", error.message, error.stack);
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
      sendEmail = false,
    } = await request.json();
    console.log(
      "Received payload:",
      JSON.stringify(
        { customerData, ticketDataList, paymentData, sendEmail },
        null,
        2
      )
    );

    if (!customerData?.passport || !ticketDataList?.length || !paymentData) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Customer, ticket, and payment data are required",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    transaction = await prisma.$transaction(async (prisma) => {
      // Create or update customer
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

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          customer_passport: customer.passport,
          email: customerData.email,
          phoneNumber: customerData.phoneNumber,
          fullName: customerData.fullName,
        },
      });

      const createdTickets = [];

      for (const ticketData of ticketDataList) {
        console.log("Processing ticket:", JSON.stringify(ticketData, null, 2));

        // Validate train and stations
        const train = await prisma.train.findUnique({
          where: { trainID: ticketData.trainID },
        });
        if (!train) {
          throw new Error(`Train ${ticketData.trainID} not found`);
        }

        const fromStation = await prisma.station.findUnique({
          where: { station_id: ticketData.from_station_id },
        });
        const toStation = await prisma.station.findUnique({
          where: { station_id: ticketData.to_station_id },
        });
        if (!fromStation || !toStation) {
          throw new Error(
            `Station ${
              !fromStation
                ? ticketData.from_station_id
                : ticketData.to_station_id
            } not found`
          );
        }

        // Handle additional customer for ticket if passport differs
        if (ticketData.passport && ticketData.passport !== customer.passport) {
          console.log(
            `Passport in ticketData (${ticketData.passport}) differs from customer.passport (${customer.passport}). Creating new customer...`
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

        // Find or create seat in seattrain
        let seatID;
        if (ticketData.coach_seat) {
          const [coach, seat_number] = ticketData.coach_seat.split("-");
          console.log(
            `Finding seat for trainID=${ticketData.trainID}, travel_date=${ticketData.travel_date}, coach=${coach}, seat_number=${seat_number}, seat_type=${ticketData.seatType}`
          );

          const travelDate = new Date(ticketData.travel_date);
          travelDate.setUTCHours(0, 0, 0, 0);

          let seat = await prisma.seattrain.findFirst({
            where: {
              trainID: ticketData.trainID,
              travel_date: travelDate,
              coach,
              seat_number,
              seat_type: ticketData.seatType,
            },
            select: { seatID: true, is_available: true },
          });

          if (!seat) {
            console.log(
              `Seat ${ticketData.coach_seat} not found. Creating new seat...`
            );
            seat = await prisma.seattrain.create({
              data: {
                trainID: ticketData.trainID,
                travel_date: travelDate,
                coach,
                seat_number,
                seat_type: ticketData.seatType,
                is_available: true,
              },
            });
            seatID = seat.seatID;
            console.log(`Created new seat with seatID: ${seatID}`);
          } else {
            seatID = seat.seatID;
            console.log(`Found seat with seatID: ${seatID}`);
          }

          // Check if seat is already booked
          const existingTicket = await prisma.ticket.findFirst({
            where: {
              seatID: seatID,
              trainID: ticketData.trainID,
              travel_date: travelDate,
              OR: [
                {
                  from_station_id: ticketData.from_station_id,
                  to_station_id: ticketData.to_station_id,
                },
                {
                  from_station_id: ticketData.to_station_id,
                  to_station_id: ticketData.from_station_id,
                },
              ],
            },
          });
          if (existingTicket) {
            throw new Error(
              `Seat ${ticketData.coach_seat} already booked for this journey on ${ticketData.travel_date}`
            );
          }
        } else {
          throw new Error("coach_seat is required");
        }

        // Create ticket
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
          travel_date: new Date(ticketData.travel_date),
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

        // Update seattrain
        console.log(`Updating seattrain for seatID: ${seatID}`);
        await prisma.seattrain.update({
          where: { seatID: seatID },
          data: { is_available: false },
        });

        // Update seat_availability_segment
        console.log(
          `Updating seat_availability_segment for seatID: ${seatID}, trainID: ${ticketData.trainID}, travel_date: ${ticketData.travel_date}, from: ${ticketData.from_station_id}, to: ${ticketData.to_station_id}`
        );
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

        // Clear Redis cache
        const cacheKey = `seats:${ticketData.trainID}:${ticketData.travel_date}:${ticketData.from_station_id}:${ticketData.to_station_id}`;
        console.log(`Attempting to clear cache for key: ${cacheKey}`);
        const redis = await initRedis();
        if (redis) {
          try {
            await redis.del(cacheKey);
            console.log(`Cleared cache for key: ${cacheKey}`);
          } catch (redisError) {
            console.warn(
              `Failed to clear cache for key ${cacheKey}:`,
              redisError.message
            );
          }
        } else {
          console.warn("Redis not available, skipping cache clear");
        }

        // Create payment record
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
        details: error.message, // Always include details for debugging
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
