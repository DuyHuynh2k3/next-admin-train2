import { PrismaClient } from "@prisma/client";

// Singleton pattern for Prisma Client
const prisma = new PrismaClient();

// Ensure connection is managed properly
if (process.env.NODE_ENV === "production") {
  prisma.$connect().catch((err) => {
    console.error("Failed to connect to the database:", err);
    process.exit(1);
  });
}

// Function to format time from DateTime to HH:MM
function formatTime(dateTime) {
  if (!dateTime || isNaN(new Date(dateTime).getTime())) {
    return null; // Return null if dateTime is invalid
  }
  const date = new Date(dateTime);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// GET request handler to fetch ticket data
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1); // Ensure page is a positive integer
  const limit = Math.max(1, parseInt(searchParams.get("limit")) || 25); // Ensure limit is a positive integer

  console.log("Fetching tickets with page:", page, "and limit:", limit);

  try {
    const tickets = await prisma.ticket.findMany({
      select: {
        ticket_id: true,
        passport: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        train: { select: { train_name: true } },
        startStation: true,
        endStation: true,
        coach_seat: true,
        seattrain: { select: { seat_number: true } },
        price: true,
        trainID: true,
        qr_code: true,
        seatID: true,
        travel_date: true,
        departTime: true,
        arrivalTime: true,
      },
      skip: (page - 1) * limit, // Skip records from previous pages
      take: limit, // Limit the number of records
    });

    // Format departTime and arrivalTime to HH:MM
    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      departTime: formatTime(ticket.departTime),
      arrivalTime: formatTime(ticket.arrivalTime),
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

// DELETE request handler to delete a ticket
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
    const result = await prisma.ticket.deleteMany({
      where: { ticket_id: parseInt(ticket_id) },
    });

    if (result.count > 0) {
      return new Response(
        JSON.stringify({ message: "Ticket deleted successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error deleting ticket:", error);
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

// PUT request handler to update a ticket
export async function PUT(request) {
  const { ticket_id, passport, fullName, phoneNumber, email } =
    await request.json();

  console.log("Received data for update:", {
    ticket_id,
    passport,
    fullName,
    phoneNumber,
    email,
  });

  if (!ticket_id || !passport || !fullName || !phoneNumber || !email) {
    return new Response(JSON.stringify({ error: "All fields are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if passport exists in the Customer table
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

    console.log("Ticket updated successfully");
    return new Response(
      JSON.stringify({ message: "Ticket updated successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating ticket:", error);
    if (error.code === "P2025") {
      // Error when record is not found
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
