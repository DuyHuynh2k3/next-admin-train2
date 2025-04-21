import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import QRService from "@/services/qrService";

const prisma = new PrismaClient();

export async function POST(request) {
  let transaction;
  try {
    const { customerData, ticketData, paymentData } = await request.json();

    if (
      !ticketData?.trainID ||
      !ticketData?.from_station_id ||
      !ticketData?.to_station_id
    ) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    transaction = await prisma.$transaction(async (prisma) => {
      let customer = null;
      if (customerData?.passport) {
        customer = await prisma.customer.upsert({
          where: { passport: customerData.passport },
          update: customerData,
          create: customerData,
        });
      }

      const ticket = await prisma.ticket.create({
        data: {
          ...ticketData,
          travel_date: new Date(ticketData.travel_date),
          customer: customer
            ? { connect: { passport: customer.passport } }
            : undefined,
          train: { connect: { trainID: ticketData.trainID } },
          station_ticket_from_station_idTostation: {
            connect: { station_id: ticketData.from_station_id },
          },
          station_ticket_to_station_idTostation: {
            connect: { station_id: ticketData.to_station_id },
          },
          q_code: `TEMP_${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      const { qrUrl } = await QRService.generateForTicket(ticket);
      console.log("Generated QR URL in save-booking:", qrUrl);

      const updatedTicket = await prisma.ticket.update({
        where: { ticket_id: ticket.ticket_id },
        data: { qr_code_url: qrUrl },
      });
      console.log("Updated ticket with QR URL:", updatedTicket.qr_code_url);

      if (paymentData) {
        await prisma.payment_ticket.create({
          data: {
            ticket_id: ticket.ticket_id,
            ...paymentData,
            payment_status: "Success",
            payment_date: new Date(),
          },
        });
      }

      return { ticket: updatedTicket };
    });

    return NextResponse.json({
      success: true,
      ticket_id: transaction.ticket.ticket_id,
      qr_code_url: transaction.ticket.qr_code_url,
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi hệ thống",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (!transaction) await prisma.$disconnect();
  }
}
