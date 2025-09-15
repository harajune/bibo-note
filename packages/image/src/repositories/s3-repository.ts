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
      IMAGE_BUCKET_NAME: string,
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
      return `${user}/images/${uuid}`
    }
    return `images/${uuid}`
  }

  private getTempImageKey(uuid: string, user: string): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context)

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/${uuid}`
    }
    return uuid
  }

  private getImageBucketName(): string {
    const envVariables = env<{ IMAGE_BUCKET_NAME: string }>(this.context)
    return envVariables.IMAGE_BUCKET_NAME
  }

  async generatePresignedUpload(uuid: string, user: string): Promise<PresignedUploadData> {
    const key = this.getTempImageKey(uuid, user)
    const imageBucketName = this.getImageBucketName()
    
    try {
      const presignedPost = await createPresignedPost(this.s3Client, {
        Bucket: imageBucketName,
        Key: key,
        Conditions: [
          ['content-length-range', 0, 10485760], // 10MB max
        ],
        Expires: 600, // 10 minutes
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

  async uploadImage(uuid: string, imageBuffer: Buffer, user: string, contentType?: string): Promise<void> {
    const key = this.getImageKey(uuid, user)
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType || 'image/png',
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

      // Convert ReadableStream to Buffer
      const stream = response.Body as ReadableStream
      const reader = stream.getReader()
      const chunks: Uint8Array[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
        return Buffer.concat(chunks)
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error(`Failed to get image from S3: ${key}`, error)
      throw new Error('Image not found')
    }
  }
}