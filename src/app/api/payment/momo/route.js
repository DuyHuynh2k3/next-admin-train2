import { NextResponse } from "next/server"; // Sử dụng NextResponse thay vì Response
import axios from "axios";
import crypto from "crypto";

// Cấu hình MoMo
const config = {
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  orderInfo: "pay with MoMo",
  partnerCode: "MOMO",
  redirectUrl: `http://localhost:3001/infoSeat`, // URL động
  ipnUrl: "https://0778-14-178-58-205.ngrok-free.app/api/callback", // Cần thay bằng URL callback thực tế khi deploy
  requestType: "payWithMethod",
  extraData: "",
  orderGroupId: "",
  autoCapture: true,
  lang: "vi",
};

// Định nghĩa tiêu đề CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3001", // Giới hạn nguồn cụ thể
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Xử lý yêu cầu POST
export async function POST(req) {
  const {
    accessKey,
    secretKey,
    partnerCode,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    orderGroupId,
    autoCapture,
    lang,
  } = config;

  const body = await req.json();
  const { amount, orderId, orderInfo: clientOrderInfo } = body;

  if (!amount || !orderId || !clientOrderInfo) {
    return NextResponse.json(
      { message: "Thiếu các trường bắt buộc" },
      { status: 400, headers: corsHeaders }
    );
  }

  const requestId = orderId;

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${clientOrderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId,
    amount,
    orderId,
    orderInfo: clientOrderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    orderGroupId,
    signature,
  });

  try {
    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (result.data && result.data.payUrl) {
      return NextResponse.json(
        { payUrl: result.data.payUrl },
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.error("Lỗi phản hồi API MoMo:", result.data);
      return NextResponse.json(
        { message: "Lỗi phản hồi API MoMo" },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Lỗi khi gọi API MoMo:", error.message);
    return NextResponse.json(
      { message: error.message },
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
