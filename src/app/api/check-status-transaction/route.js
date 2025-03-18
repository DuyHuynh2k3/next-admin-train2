//src/app/api/check-status-transaction
import axios from "axios";
import crypto from "crypto";

export async function POST(req) {
  const body = await req.json();
  const { orderId } = body;

  const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const accessKey = "F8BBA842ECF85";

  if (!orderId) {
    return new Response(JSON.stringify({ message: "Missing orderId" }), {
      status: 400,
    });
  }

  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: "MOMO",
    requestId: orderId,
    orderId: orderId,
    signature: signature,
    lang: "vi",
  });

  try {
    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/query",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (result.data && result.data.resultCode === 0) {
      return new Response(JSON.stringify(result.data), { status: 200 });
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
