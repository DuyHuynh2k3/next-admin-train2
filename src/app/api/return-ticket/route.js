import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { ticket_id, email, phoneNumber } = await request.json();
    console.log("Request Body:", { ticket_id, email, phoneNumber });

    if (!ticket_id && (!email || !phoneNumber)) {
      return NextResponse.json(
        {
          message:
            "Vui lòng cung cấp mã vé hoặc cả email và số điện thoại để xác thực",
        },
        { status: 400 }
      );
    }

    const ticketId = ticket_id ? parseInt(ticket_id) : undefined;
    if (ticketId && isNaN(ticketId)) {
      return NextResponse.json(
        { message: "Mã đặt chỗ không hợp lệ" },
        { status: 400 }
      );
    }

    let ticketInfo;

    // Ưu tiên tìm theo ticket_id nếu có
    if (ticketId) {
      ticketInfo = await prisma.ticket.findUnique({
        where: { ticket_id: ticketId },
        include: { payment_ticket: true },
      });
    } else if (email && phoneNumber) {
      ticketInfo = await prisma.ticket.findFirst({
        where: {
          email,
          phoneNumber,
        },
        include: { payment_ticket: true },
      });
    }

    if (!ticketInfo) {
      return NextResponse.json(
        { message: "Không tìm thấy thông tin vé" },
        { status: 404 }
      );
    }

    // Nếu có ticket_id nhưng không khớp với kết quả tìm được
    if (ticketId && ticketInfo.ticket_id !== ticketId) {
      return NextResponse.json(
        {
          message:
            "Thông tin vé không khớp với mã đặt chỗ. Vui lòng kiểm tra lại.",
        },
        { status: 400 }
      );
    }

    if (ticketInfo.refund_status === "Requested") {
      return NextResponse.json(
        { message: "Vé đã được gửi yêu cầu trả rồi" },
        { status: 400 }
      );
    }

    // Nếu chưa thanh toán
    if (ticketInfo.payment_status === "Paid") {
      await prisma.ticket.update({
        where: { ticket_id: ticketInfo.ticket_id },
        data: { refund_status: "Requested" },
      });

      return NextResponse.json({
        message: "Yêu cầu trả vé đã được ghi nhận (vé chưa thanh toán)",
      });
    }

    // Nếu đã thanh toán
    if (ticketInfo.payment_status === "Paid") {
      const payment = ticketInfo.payment_ticket?.[0];

      if (!payment) {
        return NextResponse.json(
          { message: "Không tìm thấy thông tin thanh toán cho vé này" },
          { status: 400 }
        );
      }

      const paymentAmountNumber = Number(payment.payment_amount);
      if (isNaN(paymentAmountNumber) || paymentAmountNumber <= 0) {
        return NextResponse.json(
          { message: "Số tiền thanh toán không hợp lệ" },
          { status: 400 }
        );
      }

      const refund = await prisma.refund.create({
        data: {
          ticket_id: ticketInfo.ticket_id,
          refund_amount: payment.payment_amount,
          refund_status: "Requested",
          refund_date: new Date(),
        },
      });

      await prisma.ticket.update({
        where: { ticket_id: ticketInfo.ticket_id },
        data: { refund_status: "Requested" },
      });

      return NextResponse.json({
        message: "Yêu cầu trả vé đã được ghi nhận (vé đã thanh toán)",
        refund,
      });
    }

    return NextResponse.json(
      { message: "Trạng thái thanh toán không hợp lệ" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu trả vé:", error);
    return NextResponse.json(
      { error: "Lỗi server", details: error.message },
      { status: 500 }
    );
  }
}
