import sharp from 'sharp'
import { v7 as uuidv7 } from 'uuid'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'
import { getContext } from 'hono/context-storage'
import { env } from 'hono/adapter'

export interface UploadResult {
  uuid: string
  url: string
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

      // Convert image to PNG using Sharp
      const pngBuffer = await sharp(buffer)
        .png({
          quality: 90,
          compressionLevel: 6
        })
        .toBuffer()

      // Generate UUID for the image
      const uuid = uuidv7()

      // Upload to repository (S3 or local file system)
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