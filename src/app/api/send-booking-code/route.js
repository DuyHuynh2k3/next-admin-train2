import prisma from "@/lib/prisma";
import { NextResponse } from "next/server"; // Đảm bảo sử dụng NextResponse

// Định nghĩa tiêu đề CORS
const corsHeaders = {
<<<<<<< HEAD
  "Access-Control-Allow-Origin": "http://www.goticket.click",
=======
  "Access-Control-Allow-Origin": "http://localhost:3001",
>>>>>>> be4eaea1244fb26753f2d14d11ce3116fb1b6fd3
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function POST(request) {
  try {
    console.log(
      "EMAIL_API_KEY:",
      process.env.EMAIL_API_KEY ? "Có API key" : "Không có API key"
    );

    const { email } = await request.json();
    console.log("Email nhận được:", email);

    if (!email) {
      console.error("Lỗi: Email không được cung cấp");
      return new NextResponse(JSON.stringify({ error: "Email là bắt buộc" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Lỗi: Email không hợp lệ:", email);
      return new NextResponse(JSON.stringify({ error: "Email không hợp lệ" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Tìm booking mới nhất dựa trên email
    const bookings = await prisma.booking.findMany({
      where: { email },
      orderBy: { created_at: "desc" },
      take: 1,
      include: {
        tickets: {
          select: {
            ticket_id: true,
            fullName: true,
            passport: true,
            phoneNumber: true,
            passenger_type: true,
            travel_date: true,
            from_station_id: true,
            to_station_id: true,
            trainID: true,
            departTime: true,
            arrivalTime: true,
            price: true,
            seatType: true,
            coach_seat: true,
            qr_code_url: true,
            station_ticket_from_station_idTostation: {
              select: { station_name: true },
            },
            station_ticket_to_station_idTostation: {
              select: { station_name: true },
            },
            train: {
              select: { train_name: true },
            },
          },
        },
      },
    });

    if (!bookings.length || !bookings[0].tickets.length) {
      console.error("Lỗi: Không tìm thấy vé nào với email:", email);
      return new NextResponse(
        JSON.stringify({ error: "Không tìm thấy vé nào với email này" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const booking = bookings[0];
    const tickets = booking.tickets;

    // Tạo nội dung email
    let htmlContent = `
      <h1>Danh sách mã đặt chỗ của bạn</h1>
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
        subject: "Danh sách mã đặt chỗ của bạn",
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
    return new NextResponse(
      JSON.stringify({
        message: "Danh sách mã đặt chỗ đã được gửi đến email của bạn!",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Lỗi khi gửi email:", error.message, error.stack);
    return new NextResponse(
      JSON.stringify({
        error: error.message || "Gửi email thất bại, vui lòng thử lại",
      }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Xử lý yêu cầu OPTIONS (preflight CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
