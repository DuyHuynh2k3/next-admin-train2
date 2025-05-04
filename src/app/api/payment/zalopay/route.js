import { NextResponse } from "next/server";
import axios from "axios";
import moment from "moment-timezone";
import crypto from "crypto";

// Cấu hình ZaloPay
const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

// Định nghĩa tiêu đề CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3001", // Giới hạn nguồn cụ thể
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Xử lý yêu cầu POST
export async function POST(request) {
  try {
    const { amount, orderId, orderInfo } = await request.json();

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Số tiền hợp lệ và lớn hơn 0 là bắt buộc" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!config.app_id || !config.key1) {
      return NextResponse.json(
        { error: "Lỗi cấu hình server: Thiếu thông tin xác thực ZaloPay" },
        { status: 500, headers: corsHeaders }
      );
    }

    const embed_data = {
      redirecturl: `http://localhost:3001/infoSeat`, // URL động
    };
    const items = [];
    const transID = orderId || Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format("YYMMDD")}_${transID}`;

    const order = {
      app_id: config.app_id,
      app_trans_id,
      app_user: "user123",
      app_time: moment().tz("Asia/Ho_Chi_Minh").valueOf(),
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      amount: parseInt(amount),
      callback_url:
        "https://b074-1-53-37-194.ngrok-free.app/api/callback/zalopay", // Thay bằng URL callback thực tế khi deploy
      description: orderInfo || `Thanh toán cho đơn hàng #${transID}`,
      bank_code: "",
    };

    const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = crypto
      .createHmac("sha256", config.key1)
      .update(data)
      .digest("hex");

    const result = await axios.post(config.endpoint, null, { params: order });

    return NextResponse.json(result.data, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Lỗi khi xử lý thanh toán ZaloPay:", error);
    return NextResponse.json(
      { error: "Xử lý thanh toán thất bại", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Xử lý yêu cầu OPTIONS (preflight CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
