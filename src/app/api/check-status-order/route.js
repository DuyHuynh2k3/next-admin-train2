import { NextResponse } from "next/server";
import CryptoJS from "crypto-js"; // Thư viện để tạo mã HMAC
import axios from "axios"; // Thư viện để gọi API bên ngoài
import qs from "qs"; // Thư viện để xử lý dữ liệu dạng x-www-form-urlencoded

// Cấu hình ZaloPay từ biến môi trường
const config = {
  app_id: process.env.ZALOPAY_APP_ID, // ID ứng dụng
  key1: process.env.ZALOPAY_KEY1, // Key1 để tạo chữ ký HMAC
  key2: process.env.ZALOPAY_KEY2, // Key2 để xác thực callback
};

export async function POST(request) {
  const { app_trans_id } = await request.json(); // Lấy mã giao dịch từ request

  // Tạo dữ liệu để gọi API kiểm tra trạng thái
  const postData = {
    app_id: config.app_id,
    app_trans_id, // Mã giao dịch cần kiểm tra
  };

  // Tạo chuỗi dữ liệu để tính toán chữ ký HMAC
  const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
  postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString(); // Tạo chữ ký HMAC

  // Cấu hình request gọi API ZaloPay
  const postConfig = {
    method: "post",
    url: "https://sb-openapi.zalopay.vn/v2/query", // Endpoint API ZaloPay Sandbox
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // Định dạng dữ liệu
    },
    data: qs.stringify(postData), // Chuyển đổi dữ liệu thành x-www-form-urlencoded
  };

  try {
    // Gọi API ZaloPay để kiểm tra trạng thái đơn hàng
    const result = await axios(postConfig);
    return NextResponse.json(result.data); // Trả về kết quả từ ZaloPay
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // Xử lý lỗi
  }
}
