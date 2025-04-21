import prisma from "@/lib/prisma"; // Import Prisma Client từ file cấu hình
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const body = await req.json();
    const { account, password } = body;

    console.log("Request body:", body);

    // Kiểm tra tài khoản có tồn tại không
    const user = await prisma.admin.findUnique({
      where: { account },
    });

    console.log("User found:", user);

    if (!user) {
      return new Response(
        JSON.stringify({ message: "Invalid account or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Tạm thời bỏ qua mã hóa mật khẩu
    if (password !== user.password) {
      return new Response(
        JSON.stringify({ message: "Invalid account or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Tạo JWT token
    const token = jwt.sign({ adminID: user.adminID }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return new Response(
      JSON.stringify({ message: "Login successful", token }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
