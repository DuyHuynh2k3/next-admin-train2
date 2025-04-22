import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Đảm bảo bạn đã cấu hình prisma đúng cách

// GET - Lấy danh sách tất cả các chuyên mục
export async function GET() {
  try {
    const categories = await prisma.category.findMany();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Lỗi khi fetch categories:", error);
    return NextResponse.json(
      { error: "Không thể lấy các chuyên mục" },
      { status: 500 }
    );
  }
}
