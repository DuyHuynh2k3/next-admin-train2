import axios from "axios";
import crypto from "crypto";

const config = {
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  orderInfo: "pay with MoMo",
  partnerCode: "MOMO",
  redirectUrl: `http://localhost:3001/infoSeat`, // Sử dụng URL động
  ipnUrl: "https://0778-14-178-58-205.ngrok-free.app/api/callback", // Cần thay bằng URL callback thực tế khi deploy
  requestType: "payWithMethod",
  extraData: "",
  orderGroupId: "",
  autoCapture: true,
  lang: "vi",
};

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
    return new Response(
      JSON.stringify({ message: "Thiếu các trường bắt buộc" }),
      { status: 400 }
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
      return new Response(JSON.stringify({ payUrl: result.data.payUrl }), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", // Thêm CORS nếu cần
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } else {
      console.error("Lỗi phản hồi API MoMo:", result.data);
      return new Response(
        JSON.stringify({ message: "Lỗi phản hồi API MoMo" }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi gọi API MoMo:", error.message);
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
    });
  }
}
