// pages/api/ticket/requested.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const requestedTickets = await prisma.ticket.findMany({
      where: {
        refund_status: "Requested",
      },
    });

    return NextResponse.json(requestedTickets, { status: 200 });
  } catch (error) {
    console.error("Error fetching requested tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch requested tickets", details: error.message },
      { status: 500 }
    );
  }
}