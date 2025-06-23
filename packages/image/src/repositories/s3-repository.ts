import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { env } from 'hono/adapter'
import { getContext } from 'hono/context-storage'

export interface PresignedUploadData {
  uploadUrl: string
  fields: Record<string, string>
}

export class S3Repository {
  private s3Client: S3Client
  private bucketName: string
  private context: any

  constructor() {
    this.context = getContext()
    const environmentVariables = env<{
      WIKI_BUCKET_NAME: string,
      AWS_REGION: string,
      AWS_ACCESS_KEY_ID: string,
      AWS_SECRET_ACCESS_KEY: string,
      AWS_SESSION_TOKEN: string,
      MULTITENANT: string
    }>(this.context)

    this.s3Client = new S3Client({
      region: environmentVariables.AWS_REGION,
      credentials: {
        accessKeyId: environmentVariables.AWS_ACCESS_KEY_ID,
        secretAccessKey: environmentVariables.AWS_SECRET_ACCESS_KEY,
        sessionToken: environmentVariables.AWS_SESSION_TOKEN,
      },
    })
    this.bucketName = environmentVariables.WIKI_BUCKET_NAME
  }

  private getImageKey(uuid: string, user: string): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context)

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/images/${uuid}.png`
    }
    return `images/${uuid}.png`
  }

  private getTempImageKey(uuid: string, user: string): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context)

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/temp-uploads/${uuid}`
    }
    return `temp-uploads/${uuid}`
  }

  async generatePresignedUpload(uuid: string, user: string): Promise<PresignedUploadData> {
    const key = this.getTempImageKey(uuid, user)
    
    try {
      const presignedPost = await createPresignedPost(this.s3Client, {
        Bucket: this.bucketName,
        Key: key,
        Conditions: [
          ['content-length-range', 0, 10485760], // 10MB max
          ['starts-with', '$Content-Type', 'image/'],
        ],
        Expires: 3600, // 1 hour
      })
      
      return {
        uploadUrl: presignedPost.url,
        fields: presignedPost.fields
      }
    } catch (error) {
      console.error('Failed to generate presigned URL:', error)
      throw new Error('Failed to generate presigned upload URL')
    }
  }

  async uploadImage(uuid: string, imageBuffer: Buffer, user: string): Promise<void> {
    const key = this.getImageKey(uuid, user)
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000', // 1 year
    }))
  }

  async getImage(uuid: string, user: string): Promise<Buffer> {
    const key = this.getImageKey(uuid, user)
    
    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }))

      if (!response.Body) {
        throw new Error('No body in S3 response')
      }

      const chunks: Uint8Array[] = []
      const stream = response.Body as any

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk))
        stream.on('error', reject)
        stream.on('end', () => resolve(Buffer.concat(chunks)))
      })
    } catch (error) {
      console.error(`Failed to get image from S3: ${key}`, error)
      throw new Error('Image not found')
    }
  }
}