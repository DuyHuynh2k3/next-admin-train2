import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import moment from "moment-timezone"; // Thêm thư viện moment-timezone để xử lý múi giờ

const prisma = new PrismaClient();

export async function POST(request) {
  const { customerData, ticketData, paymentData } = await request.json();

  try {
    // Lưu thông tin khách hàng
    const customer = await prisma.customer.upsert({
      where: { passport: customerData.passport },
      update: customerData,
      create: customerData,
    });

    // Chuyển đổi thời gian từ UTC sang múi giờ địa phương (Asia/Ho_Chi_Minh)
    const travelDateLocal = moment
      .utc(ticketData.travel_date)
      .tz("Asia/Ho_Chi_Minh")
      .toDate();
    const departTimeLocal = moment
      .utc(ticketData.departTime)
      .tz("Asia/Ho_Chi_Minh")
      .toDate();
    const arrivalTimeLocal = moment
      .utc(ticketData.arrivalTime)
      .tz("Asia/Ho_Chi_Minh")
      .toDate();

    // Lưu thông tin vé với thời gian đã chuyển đổi
    const ticket = await prisma.ticket.create({
      data: {
        fullName: ticketData.fullName,
        phoneNumber: ticketData.phoneNumber,
        email: ticketData.email,
        qr_code: ticketData.qr_code,
        coach_seat: ticketData.coach_seat,
        travel_date: travelDateLocal,
        startStation: ticketData.startStation,
        endStation: ticketData.endStation,
        departTime: departTimeLocal,
        arrivalTime: arrivalTimeLocal,
        price: ticketData.price,
        payment_status: ticketData.payment_status,
        refund_status: ticketData.refund_status,
        customer: { connect: { passport: customer.passport } },
        seattrain: { connect: { seatID: ticketData.seatID } },
        train: { connect: { trainID: ticketData.trainID } },
      },
    });

    // Chuyển đổi payment_date từ UTC sang múi giờ địa phương (Asia/Ho_Chi_Minh)
    const paymentDateLocal = moment
      .utc(paymentData.payment_date)
      .tz("Asia/Ho_Chi_Minh")
      .toDate();

    // Lưu thông tin thanh toán với payment_date đã chuyển đổi
    const payment = await prisma.payment_ticket.create({
      data: {
        payment_method: paymentData.payment_method,
        payment_amount: paymentData.payment_amount,
        payment_status: paymentData.payment_status,
        payment_date: paymentDateLocal, // Lưu thời gian địa phương
        ticket: { connect: { ticket_id: ticket.ticket_id } },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
