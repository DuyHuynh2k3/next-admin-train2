//src/app/api/callback/zalopay
import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import moment from "moment-timezone"; // Sử dụng moment-timezone

const config = {
  key2: process.env.ZALOPAY_KEY2,
};

export async function POST(request) {
  const { data, mac } = await request.json();
  let result = {};

  try {
    const computedMac = CryptoJS.HmacSHA256(data, config.key2).toString();

    if (computedMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      console.log(dataJson);
      const payment_date = moment()
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD HH:mm:ss"); // Chuyển đổi thời gian sang múi giờ Việt Nam
      console.log("Payment date:", payment_date);

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  return NextResponse.json(result);
}
