//src/app/api/payment/zalopay:
import { NextResponse } from "next/server";
import axios from "axios";
import moment from "moment-timezone";
import crypto from "crypto"; // Sử dụng module crypto của Node.js thay vì crypto-js

const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

export async function POST(request) {
  try {
    const { amount, orderId, orderInfo } = await request.json();

    // Kiểm tra dữ liệu đầu vào
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Số tiền hợp lệ và lớn hơn 0 là bắt buộc" },
        { status: 400 }
      );
    }

    // Kiểm tra biến môi trường
    if (!config.app_id || !config.key1) {
      return NextResponse.json(
        { error: "Lỗi cấu hình server: Thiếu thông tin xác thực ZaloPay" },
        { status: 500 }
      );
    }

    const embed_data = {
      redirecturl: "http://localhost:3001/infoseat",
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
        "https://b074-1-53-37-194.ngrok-free.app/api/callback/zalopay",
      description: orderInfo || `Thanh toán cho đơn hàng #${transID}`,
      bank_code: "",
    };

    // Tạo chuỗi dữ liệu cho HMAC
    const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = crypto
      .createHmac("sha256", config.key1)
      .update(data)
      .digest("hex");

    // Gửi yêu cầu đến ZaloPay
    const result = await axios.post(config.endpoint, null, { params: order });

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi xử lý thanh toán ZaloPay:", error);
    return NextResponse.json(
      { error: "Xử lý thanh toán thất bại", details: error.message },
      { status: 500 }
    );
  }
}
