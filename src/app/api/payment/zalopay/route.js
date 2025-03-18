import { NextResponse } from "next/server";
import CryptoJS from "crypto-js"; // Thư viện để tạo mã HMAC
import axios from "axios"; // Thư viện để gọi API bên ngoài
import moment from "moment"; // Thư viện để xử lý thời gian

// Cấu hình ZaloPay từ biến môi trường
const config = {
  app_id: process.env.ZALOPAY_APP_ID, // ID ứng dụng từ ZaloPay
  key1: process.env.ZALOPAY_KEY1, // Key1 để tạo chữ ký HMAC
  key2: process.env.ZALOPAY_KEY2, // Key2 để xác thực callback
  endpoint: "https://sb-openapi.zalopay.vn/v2/create", // Endpoint API ZaloPay Sandbox
};

export async function POST(request) {
  // Dữ liệu nhúng (embed_data) sẽ được trả về sau khi thanh toán thành công
  const embed_data = {
    redirecturl: "http://localhost:3001/infoseat", // URL chuyển hướng sau khi thanh toán
  };

  const items = []; // Danh sách sản phẩm (nếu có)
  const transID = Math.floor(Math.random() * 1000000); // Tạo một transaction ID ngẫu nhiên

  // Tạo đối tượng đơn hàng
  const order = {
    app_id: config.app_id, // ID ứng dụng
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`, // Mã giao dịch (định dạng: YYMMDD_transID)
    app_user: "user123", // Thông tin người dùng
    app_time: Date.now(), // Thời gian tạo đơn hàng (timestamp)
    item: JSON.stringify(items), // Danh sách sản phẩm (dạng JSON string)
    embed_data: JSON.stringify(embed_data), // Dữ liệu nhúng (dạng JSON string)
    amount: 650000, // Số tiền thanh toán (đơn vị: VND)
    callback_url: "https://b074-1-53-37-194.ngrok-free.app/callback", // URL callback để ZaloPay thông báo kết quả
    description: `Lazada - Payment for the order #${transID}`, // Mô tả đơn hàng
    bank_code: "", // Mã ngân hàng (nếu có)
  };

  // Tạo chuỗi dữ liệu để tính toán chữ ký HMAC
  const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString(); // Tạo chữ ký HMAC

  try {
    // Gọi API ZaloPay để tạo đơn hàng
    const result = await axios.post(config.endpoint, null, { params: order });
    return NextResponse.json(result.data); // Trả về kết quả từ ZaloPay
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // Xử lý lỗi
  }
}
