import { NextResponse } from "next/server";
import CryptoJS from "crypto-js"; // Thư viện để tạo mã HMAC

// Cấu hình ZaloPay từ biến môi trường
const config = {
  key2: process.env.ZALOPAY_KEY2, // Key2 để xác thực callback
};

export async function POST(request) {
  const { data, mac } = await request.json(); // Lấy dữ liệu từ callback
  let result = {};

  try {
    // Tạo chữ ký HMAC từ dữ liệu callback và key2
    const computedMac = CryptoJS.HmacSHA256(data, config.key2).toString();

    // So sánh chữ ký từ ZaloPay và chữ ký tính toán
    if (computedMac !== mac) {
      result.return_code = -1; // Callback không hợp lệ
      result.return_message = "mac not equal";
    } else {
      // Callback hợp lệ, cập nhật trạng thái đơn hàng
      const dataJson = JSON.parse(data);
      console.log(
        "update order's status = success where app_trans_id =",
        dataJson["app_trans_id"]
      );

      result.return_code = 1; // Thành công
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0; // Lỗi, ZaloPay sẽ thử lại
    result.return_message = ex.message;
  }

  return NextResponse.json(result); // Trả về kết quả cho ZaloPay
}
