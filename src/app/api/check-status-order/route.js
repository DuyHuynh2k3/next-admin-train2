import { NextResponse } from "next/server";
import { createHmac } from "crypto"; // Sử dụng built-in crypto module
import axios from "axios";
import qs from "qs";
import moment from "moment-timezone";

const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
};

export async function POST(request) {
  try {
    const { app_trans_id } = await request.json();

    // Validate input
    if (!app_trans_id) {
      return NextResponse.json(
        { error: "app_trans_id is required" },
        { status: 400 }
      );
    }

    const postData = {
      app_id: config.app_id,
      app_trans_id,
    };

    // Tạo chuỗi dữ liệu để hash
    const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;

    // Tạo MAC sử dụng HMAC-SHA256
    postData.mac = createHmac("sha256", config.key1).update(data).digest("hex");

    // Gọi API Zalopay
    const response = await axios({
      method: "post",
      url: "https://sb-openapi.zalopay.vn/v2/query",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: qs.stringify(postData),
      timeout: 10000, // 10 seconds timeout
    });

    // Log thời gian thanh toán
    const payment_date = moment()
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss");
    console.log("Payment date:", payment_date);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error in check-status-order:", error);

    // Xử lý lỗi chi tiết hơn
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.message || error.message;

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
