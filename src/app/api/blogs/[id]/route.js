import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Hàm xử lý CORS
function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function GET(request) {  // Không dùng `context` nữa
  try {
    // Lấy `id` từ URL (vd: `/api/blogs/19` → `19`)
    const urlParts = request.url.split('/');
    const id = parseInt(urlParts[urlParts.length - 1]);

    // Kiểm tra nếu `id` không hợp lệ
    if (isNaN(id)) {
      return withCors(
        NextResponse.json({ message: "ID không hợp lệ" }, { status: 400 })
      );
    }

    const blog = await prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      return withCors(
        NextResponse.json({ message: "Không tìm thấy bài viết" }, { status: 404 })
      );
    }

    const parsedBlog = {
      ...blog,
      imageUrls: blog.imageUrls ? JSON.parse(blog.imageUrls) : [],
      sections: blog.sections ? JSON.parse(blog.sections) : [],
      createdAt: blog.createdAt.toISOString(),
    };

    return withCors(NextResponse.json(parsedBlog));
  } catch (err) {
    console.error("Lỗi khi lấy bài viết:", err);
    return withCors(
      NextResponse.json({ message: "Lỗi server" }, { status: 500 })
    );
  }
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}