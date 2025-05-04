//src/middleware/cors.js
import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";
import axios from "axios";
import moment from "moment";
import { v1 as uuid } from "uuid";

const config = {
  appid: process.env.ZALOPAY_APP_ID,
  key1: process.env.ZALOPAY_KEY1,
  key2: process.env.ZALOPAY_KEY2,
  endpoint: process.env.ZALOPAY_ENDPOINT,
};

export async function POST(request) {
  const { items, amount, description } = await request.json();

  const embeddata = {
    merchantinfo: "embeddata123",
  };

  const order = {
    appid: config.appid,
    apptransid: `${moment().format("YYMMDD")}_${uuid()}`,
    appuser: "demo",
    apptime: Date.now(),
    item: JSON.stringify(items),
    embeddata: JSON.stringify(embeddata),
    amount: amount,
    description: description,
    bankcode: "zalopayapp",
  };

  const data = `${config.appid}|${order.apptransid}|${order.appuser}|${order.amount}|${order.apptime}|${order.embeddata}|${order.item}`;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    const response = await axios.post(config.endpoint, null, { params: order });
    return NextResponse.json(response.data, {
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3001",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
