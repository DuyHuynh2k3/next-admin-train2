import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ message: 'Không có file' }, { status: 400 });
    }

    // Kiểm tra loại file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    const fileType = file.type;
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ message: 'Loại file không hợp lệ' }, { status: 400 });
    }

    // Kiểm tra kích thước file (5MB)
    const maxSize = 5 * 1024 * 1024;  // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ message: 'File quá lớn, vui lòng chọn file dưới 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;

    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: `uploads/${fileName}`,
      Body: buffer,
      ContentType: fileType,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const imageUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${fileName}`;

    return NextResponse.json({ url: imageUrl, message: 'Tải ảnh thành công' });
  } catch (err) {
    console.error('Lỗi upload:', err);
    return NextResponse.json({ message: `Lỗi khi upload ảnh: ${err.message || 'Không xác định'}` }, { status: 500 });
  }
}
