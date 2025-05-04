import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  try {
    const { booking_id, ticket_ids, email, payment_status } =
      await request.json();

    if (!booking_id || !ticket_ids?.length || !email) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin cần thiết" },
        { status: 400 }
      );
    }

    if (payment_status !== "Success") {
      return NextResponse.json(
        { success: false, error: "Thanh toán không thành công" },
        { status: 400 }
      );
    }

    // Tìm booking và tickets
    const booking = await prisma.booking.findUnique({
      where: { booking_id: parseInt(booking_id) },
      include: {
        tickets: {
          include: {
            station_ticket_from_station_idTostation: {
              select: { station_name: true },
            },
            station_ticket_to_station_idTostation: {
              select: { station_name: true },
            },
            train: { select: { train_name: true } },
          },
        },
      },
    });

    if (!booking || booking.tickets.length !== ticket_ids.length) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy thông tin đặt vé" },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái thanh toán
    await prisma.$transaction(async (prisma) => {
      for (const ticket_id of ticket_ids) {
        await prisma.ticket.update({
          where: { ticket_id },
          data: { payment_status: "Paid" },
        });
        await prisma.payment_ticket.updateMany({
          where: { ticket_id },
          data: { payment_status: "Success" },
        });
      }
    });

    // Gửi email xác nhận
    await sendBookingEmail(booking.tickets, booking, email);

    return NextResponse.json({
      success: true,
      message: "Xác nhận thanh toán và gửi email thành công",
    });
  } catch (error) {
    console.error("Error confirming payment:", {
      message: error.message,
      stack: error.stack,
      raw: error,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi khi xác nhận thanh toán hoặc gửi email",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
