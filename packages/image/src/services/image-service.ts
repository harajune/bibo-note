import { v7 as uuidv7 } from 'uuid'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'
import { getContext } from 'hono/context-storage'
import { env } from 'hono/adapter'

export interface PresignedUploadResult {
  uuid: string
  uploadUrl: string
  fields: Record<string, string>
  viewUrl: string
}

export interface UploadResult {
  uuid: string
  url: string
}

// Separate service for presigned URL generation to avoid sharp dependency
export class PresignedUrlService {
  private repository: S3Repository | FileRepository

  constructor() {
    const context = getContext()
    const envVariables = env<{
      MODE: string
    }>(context)
    
    const mode = envVariables.MODE || 'development'
    this.repository = mode === 'production' 
      ? new S3Repository() 
      : new FileRepository()
  }

  async generatePresignedUpload(user: string): Promise<PresignedUploadResult> {
    const uuid = uuidv7()
    
    if (this.repository instanceof S3Repository) {
      // For production, generate actual presigned URL
      const presignedData = await this.repository.generatePresignedUpload(uuid, user)
      return {
        uuid,
        uploadUrl: presignedData.uploadUrl,
        fields: presignedData.fields,
        viewUrl: `/image/view/${uuid}`
      }
    } else {
      // For development, return a mock response for local development
      return {
        uuid,
        uploadUrl: `/image/upload-direct/${uuid}`,
        fields: {},
        viewUrl: `/image/view/${uuid}`
      }
    }
  }
}

export class ImageService {
  private repository: S3Repository | FileRepository

  constructor() {
    const context = getContext()
    const envVariables = env<{
      MODE: string
    }>(context)
    
    const mode = envVariables.MODE || 'development'
    this.repository = mode === 'production' 
      ? new S3Repository() 
      : new FileRepository()
  }

  async uploadImage(file: File, user: string): Promise<UploadResult> {
    try {
      // Read the file buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Convert image to PNG using Sharp (only for local development)
      // In production, this will be handled by the image processor lambda
      const sharp = await import('sharp')
      const pngBuffer = await sharp.default(buffer)
        .png({
          quality: 90,
          compressionLevel: 6
        })
        .toBuffer()

      // Generate UUID for the image
      const uuid = uuidv7()

      // Upload to repository (only for local development)
      await this.repository.uploadImage(uuid, pngBuffer, user)

      // Return the result with URL
      return {
        uuid,
        url: `/image/view/${uuid}`
      }
    } catch (error) {
      console.error('Error processing image:', error)
      throw new Error('Failed to process and upload image')
    }
  }

  async getImage(uuid: string, user: string): Promise<Buffer> {
    try {
      return await this.repository.getImage(uuid, user)
    } catch (error) {
      console.error('Error retrieving image:', error)
      throw new Error('Image not found')
    }
  }
}