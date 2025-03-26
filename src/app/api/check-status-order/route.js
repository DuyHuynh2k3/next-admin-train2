//src/app/api/check-status-order
import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import axios from "axios";
import qs from "qs";
import moment from "moment-timezone"; // Sử dụng moment-timezone

const config = {
  app_id: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
};

export async function POST(request) {
  const { app_trans_id } = await request.json();

  const postData = {
    app_id: config.app_id,
    app_trans_id,
  };

  const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
  postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  const postConfig = {
    method: "post",
    url: "https://sb-openapi.zalopay.vn/v2/query",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: qs.stringify(postData),
  };

  try {
    const result = await axios(postConfig);
    const payment_date = moment()
      .tz("Asia/Ho_Chi_Minh")
      .format("YYYY-MM-DD HH:mm:ss"); // Chuyển đổi thời gian sang múi giờ Việt Nam
    console.log("Payment date:", payment_date);

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
