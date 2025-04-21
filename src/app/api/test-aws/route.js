import { NextResponse } from "next/server";
import {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

export async function GET() {
  // Tạo client S3
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log("Starting AWS test...");

    // Kiểm tra kết nối
    await s3Client.send(new ListBucketsCommand({}));

    // Upload file test
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: "test-nextjs.txt",
        Body: "Hello from Next.js!",
      })
    );

    return NextResponse.json({
      success: true,
      message: "AWS S3 connection successful!",
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
