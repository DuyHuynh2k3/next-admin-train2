import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Hàm thêm CORS header cho mỗi response
function withCors(response) {
  response.headers.set(
    "Access-Control-Allow-Origin",
    "http://www.goticket.click"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}
// OPTIONS - Trả về headers CORS cho preflight request
export function OPTIONS() {
  const response = new NextResponse(null, { status: 204 }); // No Content
  return withCors(response);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");

    let blogs;

    if (categorySlug) {
      blogs = await prisma.blog.findMany({
        where: {
          category: {
            slug: categorySlug, // 🔍 lọc theo slug của category
          },
        },
        include: { category: true },
      });
    } else {
      blogs = await prisma.blog.findMany({
        include: { category: true },
      });
    }

    const parsedBlogs = blogs.map((blog) => ({
      ...blog,
      imageUrls: blog.imageUrls ? JSON.parse(blog.imageUrls) : [],
      sections: blog.sections ? JSON.parse(blog.sections) : [],
      createdAt: blog.createdAt.toISOString(),
    }));

    const response = NextResponse.json(parsedBlogs);
    return withCors(response);
  } catch (err) {
    console.error("Lỗi khi lấy blog:", err);
    const errorResponse = NextResponse.json(
      { message: "Lỗi khi lấy dữ liệu bài viết" },
      { status: 500 }
    );
    return withCors(errorResponse);
  }
}

// POST - Thêm bài viết mới
export async function POST(request) {
  try {
    const {
      title,
      content,
      categoryId,
      imageUrls = [],
      sections = [],
    } = await request.json();

    if (!title || !categoryId) {
      const errorResponse = NextResponse.json(
        { message: "Thiếu thông tin bài viết" },
        { status: 400 }
      );
      return withCors(errorResponse);
    }

    const newBlog = await prisma.blog.create({
      data: {
        title,
        content,
        categoryId,
        imageUrls: JSON.stringify(imageUrls), // Luôn stringify kể cả mảng rỗng
        sections: JSON.stringify(sections), // Luôn stringify kể cả mảng rỗng
      },
    });

    const response = NextResponse.json({
      ...newBlog,
      imageUrls,
      sections, // Trả về luôn dạng mảng cho client
    });
    return withCors(response);
  } catch (err) {
    console.error("Lỗi khi thêm blog:", err);
    const errorResponse = NextResponse.json(
      { message: "Lỗi khi thêm dữ liệu bài viết" },
      { status: 500 }
    );
    return withCors(errorResponse);
  }
}

// PUT - Cập nhật bài viết
export async function PUT(request) {
  try {
    const { id, title, content, categoryId, imageUrls, sections } =
      await request.json();

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        content,
        categoryId,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        sections: sections ? JSON.stringify(sections) : null,
      },
    });

    const response = NextResponse.json(updatedBlog);
    return withCors(response);
  } catch (err) {
    console.error("Lỗi khi cập nhật blog:", err);
    const errorResponse = NextResponse.json(
      { message: "Lỗi khi cập nhật bài viết" },
      { status: 500 }
    );
    return withCors(errorResponse);
  }
}

// DELETE - Xóa bài viết
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      const errorResponse = NextResponse.json(
        { message: "Argument 'id' is missing." },
        { status: 400 }
      );
      return withCors(errorResponse);
    }

    const deletedBlog = await prisma.blog.delete({
      where: { id: Number(id) },
    });

    const response = NextResponse.json(deletedBlog);
    return withCors(response);
  } catch (err) {
    console.error("Lỗi khi xóa blog:", err);
    const errorResponse = NextResponse.json(
      { message: "Lỗi khi xóa bài viết" },
      { status: 500 }
    );
    return withCors(errorResponse);
  }
}
