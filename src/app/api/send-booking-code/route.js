import prisma from "@/lib/prisma";

// app/api/send-booking-code/route.js
export async function POST(request) {
  try {
    // Log API key để kiểm tra
    console.log(
      "BREVO_API_KEY:",
      process.env.BREVO_API_KEY ? "Có API key" : "Không có API key"
    );

    // Lấy email từ body
    const { email } = await request.json();
    console.log("Email nhận được:", email);

    if (!email) {
      console.error("Lỗi: Email không được cung cấp");
      return new Response(JSON.stringify({ error: "Email là bắt buộc" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Lỗi: Email không hợp lệ:", email);
      return new Response(JSON.stringify({ error: "Email không hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Truy vấn ticket mới nhất dựa trên email
    const ticket = await prisma.ticket.findFirst({
      where: {
        email: email,
      },
      orderBy: {
        ticket_id: "desc", // Sắp xếp giảm dần để lấy ticket mới nhất
      },
      select: {
        ticket_id: true,
        travel_date: true,
        from_station_id: true,
        to_station_id: true,
        station_ticket_from_station_idTostation: {
          select: { station_name: true }, // Tên ga đi
        },
        station_ticket_to_station_idTostation: {
          select: { station_name: true }, // Tên ga đến
        },
      },
    });

    // Kiểm tra nếu không tìm thấy ticket
    if (!ticket) {
      console.error("Lỗi: Không tìm thấy vé nào với email:", email);
      return new Response(
        JSON.stringify({ error: "Không tìm thấy vé nào với email này" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Lấy thông tin từ ticket
    const ticketId = ticket.ticket_id;
    const travelDate = ticket.travel_date.toISOString().split("T")[0]; // Định dạng ngày (YYYY-MM-DD)
    const fromStation =
      ticket.station_ticket_from_station_idTostation.station_name;
    const toStation = ticket.station_ticket_to_station_idTostation.station_name;

    console.log("Ticket ID:", ticketId);
    console.log("Ngày đi:", travelDate);
    console.log("Ga đi:", fromStation);
    console.log("Ga đến:", toStation);

    // Gửi request đến Brevo với thông tin chi tiết
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "no-reply@yourcompany.com",
          email: "deathgunvn2003@gmail.com", // Email đã xác minh
        },
        to: [{ email }],
        subject: "Mã đặt chỗ của bạn",
        htmlContent: `
          <h1>Mã đặt chỗ của bạn</h1>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
          <p><strong>Mã đặt chỗ:</strong> ${ticketId}</p>
          <p><strong>Ngày đi:</strong> ${travelDate}</p>
          <p><strong>Ga đi:</strong> ${fromStation}</p>
          <p><strong>Ga đến:</strong> ${toStation}</p>
        `,
      }),
    });

    const responseData = await response.json();
    console.log("Response từ Brevo:", response.status, responseData);

    if (!response.ok) {
      console.error("Lỗi từ Brevo API:", responseData);
      throw new Error(responseData.message || "Gửi email thất bại");
    }

    console.log("Email gửi thành công:", responseData);
    return new Response(
      JSON.stringify({ message: "Mã đặt chỗ đã được gửi đến email của bạn!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lỗi khi gửi email:", error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || "Gửi email thất bại, vui lòng thử lại",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    // Ngắt kết nối Prisma Client
    await prisma.$disconnect();
  }
}
