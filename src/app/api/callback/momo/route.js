//src/callback/momo
// Xử lý POST request
export async function POST(req) {
  const body = await req.json();
  console.log("callback: ", body);

  const { resultCode, orderId, amount, message } = body;

  if (resultCode === 0 || resultCode === 9000) {
    console.log(
      `Giao dịch thành công: Order ID = ${orderId}, Amount = ${amount}`
    );
  } else {
    console.log(`Giao dịch thất bại: ${message}`);
  }

  return new Response(null, { status: 204 });
}
