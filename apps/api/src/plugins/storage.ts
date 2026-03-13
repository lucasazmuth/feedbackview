import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  if (!process.env.R2_BUCKET_NAME) {
    // Dev mode: return placeholder
    return `http://localhost:3001/dev-storage/${key}`
  }
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

export async function getSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key })
  return awsGetSignedUrl(s3, command, { expiresIn: 3600 })
}
