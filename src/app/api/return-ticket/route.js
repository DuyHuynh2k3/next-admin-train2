// src/app/api/return-ticket/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CORS headers configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request) {
  try {
    const { ticket_id, email, phoneNumber } = await request.json();
    console.log("Request Body:", { ticket_id, email, phoneNumber });

    // Kiểm tra dữ liệu đầu vào
    if (!ticket_id && !email && !phoneNumber) {
      console.log("Error: Missing input data");
      return new NextResponse(
        JSON.stringify({
          message:
            "Vui lòng cung cấp ít nhất một thông tin (mã đặt chỗ, email hoặc số điện thoại)",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    let ticketInfo;

    // Ưu tiên tìm kiếm bằng ticket_id nếu có
    if (ticket_id) {
      const ticketId = parseInt(ticket_id);
      if (isNaN(ticketId)) {
        console.log("Error: Invalid ticket ID");
        return new NextResponse(
          JSON.stringify({ message: "Mã đặt chỗ không hợp lệ" }),
          { status: 400, headers: corsHeaders }
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
        return new NextResponse(
          JSON.stringify({
            message: "Không tìm thấy thông tin vé với mã vé này",
          }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Kiểm tra email và phoneNumber để xác thực (nếu được cung cấp)
      if (email && ticketInfo.email?.toLowerCase() !== email.toLowerCase()) {
        console.log("Error: Email does not match");
        return new NextResponse(
          JSON.stringify({ message: "Email không khớp với vé này" }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (phoneNumber && ticketInfo.phoneNumber !== phoneNumber) {
        console.log("Error: Phone number does not match");
        return new NextResponse(
          JSON.stringify({ message: "Số điện thoại không khớp với vé này" }),
          { status: 400, headers: corsHeaders }
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
        return new NextResponse(
          JSON.stringify({
            message:
              "Vui lòng cung cấp ít nhất một thông tin (email hoặc số điện thoại)",
          }),
          { status: 400, headers: corsHeaders }
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
        return new NextResponse(
          JSON.stringify({
            message:
              "Không tìm thấy thông tin vé. Vui lòng kiểm tra lại email hoặc số điện thoại.",
          }),
          { status: 404, headers: corsHeaders }
        );
      }
    }

    console.log("Ticket Info:", ticketInfo);

    // Kiểm tra xem vé đã được yêu cầu trả chưa
    if (ticketInfo.refund_status === "Requested") {
      console.log("Error: Ticket already requested for refund");
      return new NextResponse(
        JSON.stringify({ message: "Vé đã được gửi yêu cầu trả rồi" }),
        { status: 400, headers: corsHeaders }
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

      return new NextResponse(
        JSON.stringify({
          message: "Yêu cầu trả vé đã được ghi nhận (vé chưa thanh toán)",
        }),
        { status: 200, headers: corsHeaders }
      );
    } else if (ticketInfo.payment_status === "Paid") {
      console.log("Processing refund for Paid ticket");

      if (
        !ticketInfo.payment_ticket ||
        ticketInfo.payment_ticket.length === 0
      ) {
        console.log("Error: No payment ticket found");
        return new NextResponse(
          JSON.stringify({
            message: "Không tìm thấy thông tin thanh toán cho vé này",
          }),
          { status: 400, headers: corsHeaders }
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
        return new NextResponse(
          JSON.stringify({
            message: "Số tiền thanh toán không hợp lệ",
          }),
          { status: 400, headers: corsHeaders }
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

      return new NextResponse(
        JSON.stringify({
          message: "Yêu cầu trả vé đã được ghi nhận (vé đã thanh toán)",
          refundId: refund.refund_id,
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.log("Error: Invalid payment status");
      return new NextResponse(
        JSON.stringify({ message: "Trạng thái thanh toán không hợp lệ" }),
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Lỗi khi xử lý yêu cầu trả vé:", error);
    return new NextResponse(
      JSON.stringify({ error: "Lỗi server", details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Required for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
