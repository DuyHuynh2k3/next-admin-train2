// src/app/api/infoSeat/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";
import QRService from "@/services/qrService";

const prisma = new PrismaClient();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.goticket.click", // Chỉ định domain frontend
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get("ticket_id");
    const email = searchParams.get("email");
    const phoneNumber = searchParams.get("phoneNumber");

    // Validate inputs: At least one field must be provided
    if (!ticket_id && !email && !phoneNumber) {
      return new NextResponse(
        JSON.stringify({
          error:
            "Vui lòng cung cấp ít nhất một thông tin (mã vé, email hoặc số điện thoại)",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    let ticket;

    // Prioritize ticket_id if provided
    if (ticket_id) {
      const ticketId = parseInt(ticket_id);
      if (isNaN(ticketId)) {
        return new NextResponse(
          JSON.stringify({ error: "Mã vé không hợp lệ" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Find ticket by ticket_id first
      ticket = await prisma.ticket.findUnique({
        where: { ticket_id: ticketId },
        include: {
          customer: true,
          train: true,
          station_ticket_from_station_idTostation: true,
          station_ticket_to_station_idTostation: true,
        },
      });

      if (!ticket) {
        return new NextResponse(
          JSON.stringify({
            error: "Không tìm thấy vé với mã vé này.",
          }),
          { status: 404, headers: corsHeaders }
        );
      }

      // If email or phoneNumber is provided, validate them
      if (email && ticket.email?.toLowerCase() !== email.toLowerCase()) {
        return new NextResponse(
          JSON.stringify({
            error: "Email không khớp với vé này.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (phoneNumber && ticket.phoneNumber !== phoneNumber) {
        return new NextResponse(
          JSON.stringify({
            error: "Số điện thoại không khớp với vé này.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      // If no ticket_id, search by email or phoneNumber
      const conditions = [];
      if (email) {
        conditions.push({ email: email.toLowerCase() });
      }
      if (phoneNumber) {
        conditions.push({ phoneNumber: phoneNumber });
      }

      ticket = await prisma.ticket.findFirst({
        where: {
          OR: conditions,
        },
        include: {
          customer: true,
          train: true,
          station_ticket_from_station_idTostation: true,
          station_ticket_to_station_idTostation: true,
        },
      });

      if (!ticket) {
        return new NextResponse(
          JSON.stringify({
            error:
              "Không tìm thấy thông tin vé. Vui lòng kiểm tra lại email hoặc số điện thoại.",
          }),
          { status: 404, headers: corsHeaders }
        );
      }
    }

    // Check database QR code URL
    const dbTicket = await prisma.ticket.findFirst({
      where: { ticket_id: ticket.ticket_id },
      select: { qr_code_url: true },
    });
    console.log("QR Code URL from DB:", dbTicket.qr_code_url);

    // Generate QR code if not exists or incorrect
    const expectedQrUrl = `https://d1nkpirvj8r8y4.cloudfront.net/qrcodes/ticket_${ticket.ticket_id}.png`;
    console.log("Expected QR Code URL:", expectedQrUrl);
    console.log("Current QR Code URL:", ticket.qr_code_url);

    if (!ticket.qr_code_url || ticket.qr_code_url !== expectedQrUrl) {
      console.log("QR code URL is missing or incorrect, updating...");
      try {
        const { qrUrl } = await QRService.generateForTicket(ticket);
        ticket = await prisma.ticket.update({
          where: { ticket_id: ticket.ticket_id },
          data: { qr_code_url: qrUrl },
          include: {
            customer: true,
            train: true,
            station_ticket_from_station_idTostation: true,
            station_ticket_to_station_idTostation: true,
          },
        });
        console.log("Updated QR Code URL:", ticket.qr_code_url);
      } catch (qrError) {
        console.error(
          "Failed to generate QR code, using expected URL:",
          qrError
        );
        ticket = await prisma.ticket.update({
          where: { ticket_id: ticket.ticket_id },
          data: { qr_code_url: expectedQrUrl },
          include: {
            customer: true,
            train: true,
            station_ticket_from_station_idTostation: true,
            station_ticket_to_station_idTostation: true,
          },
        });
        console.log("Force updated QR Code URL:", ticket.qr_code_url);
      }
    }

    // Format response
    console.log("Ticket QR Code URL before formatting:", ticket.qr_code_url);
    const formattedTicket = {
      ...ticket,
      travel_date: format(new Date(ticket.travel_date), "dd/MM/yyyy"),
      departTime: format(
        new Date(
          `${ticket.travel_date.toISOString().split("T")[0]}T${ticket.departTime
            .toISOString()
            .substring(11, 19)}`
        ),
        "dd/MM/yyyy HH:mm"
      ),
      arrivalTime: format(
        new Date(
          `${
            ticket.travel_date.toISOString().split("T")[0]
          }T${ticket.arrivalTime.toISOString().substring(11, 19)}`
        ),
        "dd/MM/yyyy HH:mm"
      ),
      fromStationName:
        ticket.station_ticket_from_station_idTostation?.station_name,
      toStationName: ticket.station_ticket_to_station_idTostation?.station_name,
      trainName: ticket.train?.train_name,
    };
    console.log("Formatted Ticket QR Code URL:", formattedTicket.qr_code_url);

    return new NextResponse(JSON.stringify(formattedTicket), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return new NextResponse(
      JSON.stringify({ error: "Lỗi hệ thống", details: error.message }),
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
