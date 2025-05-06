// lib/prisma.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // Ghi log truy vấn để debug
});

export default prisma;
