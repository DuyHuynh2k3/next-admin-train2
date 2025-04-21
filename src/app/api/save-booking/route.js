// src/app/api/save-booking

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const passengerTypeEnum = {
  0: "Adult",
  1: "Child",
  2: "Senior",
  3: "Student",
};


const prisma = new PrismaClient();

const parseUTCTime = (dateStr, timeStr) => {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date(dateStr);
  date.setUTCHours(parseInt(hours));
  date.setUTCMinutes(parseInt(minutes));
  return date;
};
export async function POST(request) {
  let transaction;
  try {
    const { customerData, ticketDataList, paymentData } = await request.json();
    // Start transaction
    transaction = await prisma.$transaction(async (prisma) => {
      // 1. Handle customer data
      let customer = null;
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

      // 2. Lưu danh sách vé
      const createdTickets = [];

      for (const ticketData of ticketDataList) {
        const ticketCreateData = {
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
          payment_status: "Paid",
          refund_status: "None",
          tripType: ticketData.tripType || "oneway",
          passenger_type: passengerTypeEnum[parseInt(ticketData.passenger_type)] || "Adult",
          journey_segments: ticketData.journey_segments || JSON.stringify([]),
          train: { connect: { trainID: ticketData.trainID } },
          station_ticket_from_station_idTostation: {
            connect: { station_id: ticketData.from_station_id },
          },
          station_ticket_to_station_idTostation: {
            connect: { station_id: ticketData.to_station_id },
          },
        };

        if (customer) {
          ticketCreateData.customer = {
            connect: { passport: customer.passport },
          };
        }

        if (ticketData.seatID) {
          ticketCreateData.seattrain = {
            connect: { seatID: ticketData.seatID },
          };
        }

        const ticket = await prisma.ticket.create({
          data: ticketCreateData,
        });

        createdTickets.push(ticket);

        if (ticketData.seatID) {
          await prisma.seattrain.update({
            where: { seatID: ticketData.seatID },
            data: { is_available: false },
          })
        };

        // 3. Gắn thanh toán cho từng vé nếu có
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

      // Trả danh sách ticket_id
      return {
        booking_id: `BOOK_${Date.now()}`,
        ticket_ids: createdTickets.map((t) => t.ticket_id),
      };
    });
    

    return NextResponse.json({
      success: true,
      booking_id: transaction.booking_id,
      ticket_ids: transaction.ticket_ids,
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
