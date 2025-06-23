import type { S3Event, S3Handler } from 'aws-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1'
})

export const handler: S3Handler = async (event: S3Event) => {
  console.log('Image processor triggered:', JSON.stringify(event, null, 2))

  for (const record of event.Records) {
    if (record.eventName?.startsWith('ObjectCreated')) {
      try {
        await processImage(record.s3.bucket.name, record.s3.object.key)
      } catch (error) {
        console.error('Error processing image:', error)
        // Continue processing other records even if one fails
      }
    }
  }
}

async function processImage(bucketName: string, objectKey: string): Promise<void> {
  // Only process files in temp-uploads directory
  if (!objectKey.includes('/temp-uploads/')) {
    console.log('Skipping non-temp file:', objectKey)
    return
  }

  console.log(`Processing image: ${objectKey}`)

  try {
    // Get the original uploaded file
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    })

    const response = await s3Client.send(getCommand)
    if (!response.Body) {
      throw new Error('No body in S3 response')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as any
    
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', resolve)
    })

    const originalBuffer = Buffer.concat(chunks)

    // Process image with Sharp - convert to PNG
    const processedBuffer = await sharp(originalBuffer)
      .png({
        quality: 90,
        compressionLevel: 6
      })
      .toBuffer()

    // Determine the final destination path
    // Convert: user/temp-uploads/uuid -> user/images/uuid.png
    const finalKey = objectKey
      .replace('/temp-uploads/', '/images/')
      .concat('.png')

    // Save processed image to final location
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: finalKey,
      Body: processedBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000' // 1 year
    })

    await s3Client.send(putCommand)
    console.log(`Processed image saved to: ${finalKey}`)

    // Delete the temporary file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    })

    await s3Client.send(deleteCommand)
    console.log(`Temporary file deleted: ${objectKey}`)

  } catch (error) {
    console.error(`Failed to process image ${objectKey}:`, error)
    throw error
  }
}