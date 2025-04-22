import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { ticket_id, email, phoneNumber } = await request.json();
    console.log("Request Body:", { ticket_id, email, phoneNumber });

    // Kiểm tra dữ liệu đầu vào
    if (!ticket_id && !email && !phoneNumber) {
      console.log("Error: Missing input data");
      return NextResponse.json(
        {
          message:
            "Vui lòng cung cấp ít nhất một thông tin (mã đặt chỗ, email hoặc số điện thoại)",
        },
        { status: 400 }
      );
    }

    let ticketInfo;

    // Ưu tiên tìm kiếm bằng ticket_id nếu có
    if (ticket_id) {
      const ticketId = parseInt(ticket_id);
      if (isNaN(ticketId)) {
        console.log("Error: Invalid ticket ID");
        return NextResponse.json(
          { message: "Mã đặt chỗ không hợp lệ" },
          { status: 400 }
        );
      }

      // Tìm vé bằng ticket_id
      ticketInfo = await prisma.ticket.findUnique({
        where: { ticket_id: ticketId },
        include: {
          payment_ticket: true,
        },
      });

      if (!ticketInfo) {
        console.log("Error: Ticket not found with ticket_id:", ticketId);
        return NextResponse.json(
          { message: "Không tìm thấy thông tin vé với mã vé này" },
          { status: 404 }
        );
      }

      // Kiểm tra email và phoneNumber để xác thực (nếu được cung cấp)
      if (email && ticketInfo.email?.toLowerCase() !== email.toLowerCase()) {
        console.log("Error: Email does not match");
        return NextResponse.json(
          { message: "Email không khớp với vé này" },
          { status: 400 }
        );
      }

      if (phoneNumber && ticketInfo.phoneNumber !== phoneNumber) {
        console.log("Error: Phone number does not match");
        return NextResponse.json(
          { message: "Số điện thoại không khớp với vé này" },
          { status: 400 }
        );
      }
    } else {
      // Nếu không có ticket_id, tìm kiếm bằng email hoặc phoneNumber
      const conditions = [];
      if (email) {
        conditions.push({ email: email.toLowerCase() });
      }
      if (phoneNumber) {
        conditions.push({ phoneNumber: phoneNumber });
      }

      if (conditions.length === 0) {
        console.log("Error: No valid search conditions");
        return NextResponse.json(
          {
            message:
              "Vui lòng cung cấp ít nhất một thông tin (email hoặc số điện thoại)",
          },
          { status: 400 }
        );
      }

      ticketInfo = await prisma.ticket.findFirst({
        where: {
          OR: conditions,
        },
        include: {
          payment_ticket: true,
        },
      });

      if (!ticketInfo) {
        console.log("Error: Ticket not found with email/phoneNumber");
        return NextResponse.json(
          {
            message:
              "Không tìm thấy thông tin vé. Vui lòng kiểm trai lại email hoặc số điện thoại.",
          },
          { status: 404 }
        );
      }
    }

    console.log("Ticket Info:", ticketInfo);

    // Kiểm tra xem vé đã được yêu cầu trả chưa
    if (ticketInfo.refund_status === "Requested") {
      console.log("Error: Ticket already requested for refund");
      return NextResponse.json(
        { message: "Vé đã được gửi yêu cầu trả rồi" },
        { status: 400 }
      );
    }

    // Xử lý trả vé dựa trên trạng thái thanh toán
    if (ticketInfo.payment_status === "Pending") {
      console.log("Processing refund for Pending ticket");
      await prisma.ticket.update({
        where: { ticket_id: ticketInfo.ticket_id },
        data: {
          refund_status: "Requested",
        },
      });

      return NextResponse.json({
        message: "Yêu cầu trả vé đã được ghi nhận (vé chưa thanh toán)",
      });
    } else if (ticketInfo.payment_status === "Paid") {
      console.log("Processing refund for Paid ticket");

      if (
        !ticketInfo.payment_ticket ||
        ticketInfo.payment_ticket.length === 0
      ) {
        console.log("Error: No payment ticket found");
        return NextResponse.json(
          {
            message: "Không tìm thấy thông tin thanh toán cho vé này",
          },
          { status: 400 }
        );
      }

      // Lấy bản ghi thanh toán đầu tiên
      const payment = ticketInfo.payment_ticket[0];
      const paymentAmount = payment.payment_amount;
      const paymentAmountNumber = Number(paymentAmount);
      console.log(
        "Payment Amount:",
        paymentAmount,
        "Converted:",
        paymentAmountNumber
      );

      if (isNaN(paymentAmountNumber) || paymentAmountNumber <= 0) {
        console.log("Error: Invalid payment amount");
        return NextResponse.json(
          {
            message: "Số tiền thanh toán không hợp lệ",
          },
          { status: 400 }
        );
      }

      // Tạo bản ghi hoàn trả
      const refund = await prisma.refund.create({
        data: {
          ticket_id: ticketInfo.ticket_id,
          refund_amount: paymentAmount,
          refund_status: "Requested",
          refund_date: new Date(),
        },
      });

      // Cập nhật trạng thái hoàn trả của vé
      await prisma.ticket.update({
        where: { ticket_id: ticketInfo.ticket_id },
        data: {
          refund_status: "Requested",
        },
      });

      return NextResponse.json({
        message: "Yêu cầu trả vé đã được ghi nhận (vé đã thanh toán)",
        refund: refund,
      });
    } else {
      console.log("Error: Invalid payment status");
      return NextResponse.json(
        { message: "Trạng thái thanh toán không hợp lệ" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu trả vé:", error);
    return NextResponse.json(
      { error: "Lỗi server", details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
