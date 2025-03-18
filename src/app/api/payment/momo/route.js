//src/app/api/payment/momo
import axios from "axios";
import crypto from "crypto";

const config = {
  accessKey: "F8BBA842ECF85",
  secretKey: "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  orderInfo: "pay with MoMo",
  partnerCode: "MOMO",
  redirectUrl: "http://localhost:3001/infoSeat",
  ipnUrl: "https://0778-14-178-58-205.ngrok-free.app/api/callback",
  requestType: "payWithMethod",
  extraData: "",
  orderGroupId: "",
  autoCapture: true,
  lang: "vi",
};

// Xử lý POST request
export async function POST(req) {
  const {
    accessKey,
    secretKey,
    orderInfo: defaultOrderInfo,
    partnerCode,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    orderGroupId,
    autoCapture,
    lang,
  } = config;

  // Parse request body
  const body = await req.json();
  const { amount, orderId, orderInfo: clientOrderInfo } = body;

  if (!amount || !orderId || !clientOrderInfo) {
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
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
      }); // Thêm dấu ngoặc đóng ở đây
    } else {
      console.error("MoMo API response error:", result.data);
      return new Response(
        JSON.stringify({ message: "MoMo API response error" }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error calling MoMo API:", error.message);
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
    });
  }
}
