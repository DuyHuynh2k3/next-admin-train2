import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns"; // Import hàm format từ date-fns

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Lấy tham số từ query string
    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get("ticket_id");
    const email = searchParams.get("email");
    const phoneNumber = searchParams.get("phoneNumber");

    // Debug: Kiểm tra các tham số từ frontend
    console.log("Ticket ID:", ticket_id);
    console.log("Email:", email);
    console.log("Phone Number:", phoneNumber);

    // Kiểm tra xem cả 3 tham số đều được cung cấp
    if (!ticket_id || !email || !phoneNumber) {
      return NextResponse.json(
        {
          message:
            "Vui lòng cung cấp đầy đủ thông tin (mã đặt chỗ, email và số điện thoại)",
        },
        { status: 400 }
      );
    }

    // Kiểm tra ticket_id có hợp lệ không
    const ticketId = parseInt(ticket_id);
    if (isNaN(ticketId)) {
      return NextResponse.json(
        { message: "Mã đặt chỗ không hợp lệ" },
        { status: 400 }
      );
    }

    // Truy vấn database để tìm thông tin vé
    const ticketInfo = await prisma.ticket.findFirst({
      where: {
        AND: [
          { ticket_id: ticketId },
          { email: email },
          { phoneNumber: phoneNumber },
        ],
      },
      include: {
        customer: true,
        seattrain: true,
        train: true,
      },
    });

    // Kiểm tra kết quả truy vấn
    if (ticketInfo) {
      // Định dạng lại các trường ngày và thời gian
      const formattedTicketInfo = {
        ...ticketInfo,
        travel_date: format(new Date(ticketInfo.travel_date), "dd-MM-yyyy"), // Định dạng ngày
        departTime: ticketInfo.departTime
          ? format(
              new Date(
                `1970-01-01T${ticketInfo.departTime
                  .toISOString()
                  .substring(11, 19)}`
              ),
              "HH:mm"
            ) // Chuyển đổi thời gian
          : "N/A",
        arrivalTime: ticketInfo.arrivalTime
          ? format(
              new Date(
                `1970-01-01T${ticketInfo.arrivalTime
                  .toISOString()
                  .substring(11, 19)}`
              ),
              "HH:mm"
            ) // Chuyển đổi thời gian
          : "N/A",
      };

      return NextResponse.json(formattedTicketInfo); // Trả về thông tin vé đã định dạng
    } else {
      return NextResponse.json(
        { message: "Không tìm thấy thông tin vé" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi truy vấn cơ sở dữ liệu:", error);
    return NextResponse.json(
      { error: "Lỗi server", details: error.message },
      { status: 500 }
    );
  }
}
