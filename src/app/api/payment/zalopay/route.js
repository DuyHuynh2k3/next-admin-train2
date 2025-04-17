//src/app/api/payment/zalopay
import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import axios from "axios";
import moment from "moment-timezone"; // Sử dụng moment-timezone

const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

export async function POST(request) {
  const { amount, orderId, orderInfo } = await request.json();
  const embed_data = {
    redirecturl: "http://localhost:3001/infoseat",
  };

  const items = [];
  const transID = Math.floor(Math.random() * 1000000);

  // Sử dụng moment-timezone để xử lý thời gian
  const app_time = moment().tz("Asia/Ho_Chi_Minh").valueOf(); // Lấy thời gian hiện tại theo múi giờ Việt Nam

  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    app_user: "user123",
    app_time: app_time, // Sử dụng thời gian đã chuyển đổi
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: amount,
    callback_url: "https://b074-1-53-37-194.ngrok-free.app/callback",
    description: `Lazada - Payment for the order #${transID}`,
    bank_code: "",
  };

  const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const result = await axios.post(config.endpoint, null, { params: order });
    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
