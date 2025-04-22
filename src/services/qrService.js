//src/services/qrService.js:
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";
import { promisify } from "util";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default class QRService {
  static async generateForTicket(ticket) {
    try {
      const qrContent = JSON.stringify({
        ticketId: ticket.ticket_id,
        train: ticket.trainID,
        from: ticket.from_station_id,
        to: ticket.to_station_id,
        date: ticket.travel_date,
        seat: ticket.coach_seat,
      });
      console.log("QR Content:", qrContent);

      const generateQR = promisify(QRCode.toBuffer);
      const qrBuffer = await generateQR(qrContent, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      console.log("QR Buffer generated, size:", qrBuffer.length);

      const s3Key = `qrcodes/ticket_${ticket.ticket_id}.png`;
      console.log("S3 Bucket:", process.env.AWS_S3_BUCKET);
      console.log("CloudFront Domain:", process.env.AWS_CLOUDFRONT_DOMAIN);
      console.log("Uploading to S3 with key:", s3Key);

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: qrBuffer,
        ContentType: "image/png",
        CacheControl: "max-age=31536000",
      });

      await s3Client.send(command);
      console.log("S3 upload successful for key:", s3Key);

      const qrUrl = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${s3Key}`;
      console.log("Generated QR URL:", qrUrl);

      return {
        qrUrl,
        qrContent,
      };
    } catch (error) {
      console.error("QR Generation Error:", error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }
}
