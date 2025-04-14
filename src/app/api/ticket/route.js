import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function formatTime(dateTime) {
  if (!dateTime || isNaN(new Date(dateTime).getTime())) {
    return null;
  }
  const date = new Date(dateTime);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit")) || 25);
  const refund_status = searchParams.get("refund_status");

  try {
    const whereClause = refund_status ? { refund_status } : {};

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        ticket_id: true,
        passport: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        q_code: true,
        seatID: true,
        coach_seat: true,
        trainID: true,
        travel_date: true,
        from_station_id: true,
        to_station_id: true,
        departTime: true,
        arrivalTime: true,
        price: true,
        payment_status: true,
        refund_status: true,
        passenger_type: true,
        train: {
          select: {
            train_name: true,
          },
        },
        seattrain: {
          select: {
            seat_number: true,
            coach: true,
          },
        },
        station_ticket_from_station_idTostation: {
          select: {
            station_name: true,
          },
        },
        station_ticket_to_station_idTostation: {
          select: {
            station_name: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      qr_code: ticket.q_code,
      startStation:
        ticket.station_ticket_from_station_idTostation?.station_name || "N/A",
      endStation:
        ticket.station_ticket_to_station_idTostation?.station_name || "N/A",
      departTime: formatTime(ticket.departTime),
      arrivalTime: formatTime(ticket.arrivalTime),
      coach_seat: ticket.seattrain
        ? `${ticket.seattrain.coach}-${ticket.seattrain.seat_number}`
        : ticket.coach_seat,
      train_name: ticket.train?.train_name || "N/A",
    }));

    return new Response(JSON.stringify(formattedTickets), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return new Response(
      JSON.stringify({
        error: "Database query failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const ticket_id = searchParams.get("ticket_id");

  if (!ticket_id) {
    return new Response(JSON.stringify({ error: "Ticket ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if ticket has payments or refunds first
    const payments = await prisma.payment_ticket.count({
      where: { ticket_id: parseInt(ticket_id) },
    });

    const refunds = await prisma.refund.count({
      where: { ticket_id: parseInt(ticket_id) },
    });

    if (payments > 0 || refunds > 0) {
      return new Response(
        JSON.stringify({
          error: "Cannot delete ticket with associated payments or refunds",
          details: "Please cancel payments/refunds first",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await prisma.ticket.delete({
      where: { ticket_id: parseInt(ticket_id) },
    });

    console.log("Deleted ticket:", result);

    return new Response(
      JSON.stringify({ message: "Ticket deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting ticket:", error);
    if (error.code === "P2025") {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        error: "Failed to delete ticket",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function PUT(request) {
  const { ticket_id, passport, fullName, phoneNumber, email } =
    await request.json();

  if (!ticket_id || !passport || !fullName || !phoneNumber || !email) {
    return new Response(JSON.stringify({ error: "All fields are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if passport exists in customer table
    const customer = await prisma.customer.findUnique({
      where: { passport: passport },
    });

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Passport does not exist in customer table" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { ticket_id: parseInt(ticket_id) },
      data: {
        passport: passport,
        fullName: fullName,
        phoneNumber: phoneNumber,
        email: email,
      },
    });

    return new Response(
      JSON.stringify({
        message: "Ticket updated successfully",
        ticket: updatedTicket,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating ticket:", error);
    if (error.code === "P2025") {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        error: "Failed to update ticket",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
