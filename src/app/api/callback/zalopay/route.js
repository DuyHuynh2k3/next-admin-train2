//src/app/api/callback/zalopay
import { NextResponse } from "next/server";
import moment from "moment-timezone"; // Sử dụng moment-timezone
import { createHmac } from "crypto"; // <-- Sử dụng built-in module

const config = {
  key2: process.env.ZALOPAY_KEY2,
};

export async function POST(request) {
  const { data, mac } = await request.json();
  let result = {};

  try {
    const computedMac = createHmac("sha256", config.key2)
      .update(data)
      .digest("hex");

    if (computedMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      const payment_date = moment()
        .tz("Asia/Ho_Chi_Minh")
        .format("YYYY-MM-DD HH:mm:ss");
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
