import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Đảm bảo bạn đã cấu hình prisma đúng cách

// GET - Lấy danh sách bài viết với thông tin chuyên mục
export async function GET() {
  try {
    const blogs = await prisma.blog.findMany({
      include: {
        category: true, // Lấy thông tin category khi trả về bài viết
      },
    });
    return NextResponse.json(blogs);
  } catch (err) {
    console.error("Lỗi khi lấy blog:", err);
    return NextResponse.json(
      { message: "Lỗi khi lấy dữ liệu bài viết" },
      { status: 500 }
    );
  }
}

// POST - Thêm bài viết mới
export async function POST(request) {
  try {
    const { title, content, categoryId, imageUrl } = await request.json();

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { message: "Thiếu thông tin bài viết" },
        { status: 400 }
      );
    }

    const newBlog = await prisma.blog.create({
      data: { title, content, categoryId, imageUrl },
    });

    return NextResponse.json(newBlog);
  } catch (err) {
    console.error("Lỗi khi thêm blog:", err);
    return NextResponse.json(
      { message: "Lỗi khi thêm dữ liệu bài viết" },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật bài viết
export async function PUT(request) {
  try {
    const { id, title, content, categoryId, imageUrl } = await request.json();

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: { title, content, categoryId, imageUrl },
    });

    return NextResponse.json(updatedBlog);
  } catch (err) {
    console.error("Lỗi khi cập nhật blog:", err);
    return NextResponse.json(
      { message: "Lỗi khi cập nhật bài viết" },
      { status: 500 }
    );
  }
}

// DELETE - Xóa bài viết
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Argument 'id' is missing." },
        { status: 400 }
      );
    }

    console.log("ID nhận từ client:", id);

    const deletedBlog = await prisma.blog.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json(deletedBlog);
  } catch (err) {
    console.error("Lỗi khi xóa blog:", err);
    return NextResponse.json(
      { message: "Lỗi khi xóa bài viết" },
      { status: 500 }
    );
  }
}
