// src/app/api/hello/route.js
import { NextResponse } from "next/server";

export async function GET() {
  // Hiển thị lời chào trên console backend
  console.log("Backend: Xin chào từ Next.js backend!");

  // Thêm CORS headers
  const headers = {
<<<<<<< HEAD
    "Access-Control-Allow-Origin": "http://www.goticket.click", // Cho phép tất cả các domain truy cập
=======
    "Access-Control-Allow-Origin": "http://localhost:3001", // Cho phép tất cả các domain truy cập
>>>>>>> be4eaea1244fb26753f2d14d11ce3116fb1b6fd3
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE", // Cho phép các phương thức
    "Access-Control-Allow-Headers": "Content-Type", // Cho phép các headers
  };

  // Gửi phản hồi với CORS headers
  return NextResponse.json(
    { message: "Xin chào từ Next.js backend!" },
    { headers }
  );
}
