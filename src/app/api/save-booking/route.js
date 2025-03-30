import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  let transaction;
  try {
    const { customerData, ticketData, paymentData } = await request.json();

    // Start transaction
    transaction = await prisma.$transaction(async (prisma) => {
      // 1. Handle customer data
      let customer;
      if (customerData?.passport) {
        customer = await prisma.customer.upsert({
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
      }

      // 2. Prepare ticket data
      const ticketCreateData = {
        fullName: ticketData.fullName,
        phoneNumber: ticketData.phoneNumber,
        email: ticketData.email,
        q_code:
          ticketData.q_code || `QR_${Math.random().toString(36).substr(2, 9)}`,
        coach_seat: ticketData.coach_seat,
        travel_date: new Date(ticketData.travel_date || Date.now()),
        departTime: new Date(
          `1970-01-01T${ticketData.departTime || "00:00:00"}`
        ),
        arrivalTime: new Date(
          `1970-01-01T${ticketData.arrivalTime || "00:00:00"}`
        ),
        price: ticketData.price || 0,
        payment_status: "Pending",
        refund_status: "None",
        passenger_type: "Adult",
        journey_segments: JSON.stringify([]),
        train: { connect: { trainID: ticketData.trainID } },
        station_ticket_from_station_idTostation: {
          connect: { station_id: ticketData.from_station_id },
        },
        station_ticket_to_station_idTostation: {
          connect: { station_id: ticketData.to_station_id },
        },
      };

      // Add customer relation if exists
      if (customer) {
        ticketCreateData.customer = {
          connect: { passport: customer.passport },
        };
      }

      // Add seat relation if exists
      if (ticketData.seatID) {
        ticketCreateData.seattrain = { connect: { seatID: ticketData.seatID } };
      }

      // 3. Create ticket
      const ticket = await prisma.ticket.create({
        data: ticketCreateData,
      });

      // 4. Create payment if exists (không cần truyền payment_id nếu đã có auto-increment)
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

      return { ticket };
    });

    return NextResponse.json({
      success: true,
      ticket_id: transaction.ticket.ticket_id,
    });
  } catch (error) {
    console.error("Error saving booking:", {
      message: error.message,
      stack: error.stack,
      raw: error,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi khi lưu thông tin đặt vé",
        details:
          process.env.NODE_ENV === "development"
            ? {
                message: error.message,
                error: error,
              }
            : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (!transaction) await prisma.$disconnect();
  }
}
