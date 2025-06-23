import { describe, it, expect, vi } from 'vitest'
import { ImageService } from '../services/image-service'

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn().mockImplementation(() => ({
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-png-data'))
  }))
}))

// Mock S3Repository
vi.mock('../repositories/s3-repository', () => ({
  S3Repository: vi.fn().mockImplementation(() => ({
    uploadImage: vi.fn().mockResolvedValue(undefined),
    getImage: vi.fn().mockResolvedValue(Buffer.from('fake-image-data'))
  }))
}))

// Mock FileRepository
vi.mock('../repositories/file-repository', () => ({
  FileRepository: vi.fn().mockImplementation(() => ({
    uploadImage: vi.fn().mockResolvedValue(undefined),
    getImage: vi.fn().mockResolvedValue(Buffer.from('fake-image-data'))
  }))
}))

// Mock hono context
vi.mock('hono/context-storage', () => ({
  getContext: vi.fn(() => ({}))
}))

vi.mock('hono/adapter', () => ({
  env: vi.fn(() => ({ MODE: 'development' }))
}))

describe('ImageService', () => {
  describe('uploadImage', () => {
    it('should process and upload image successfully', async () => {
      const imageService = new ImageService()
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
      } as any

      const result = await imageService.uploadImage(mockFile, 'test-user')

      expect(result).toHaveProperty('uuid')
      expect(result).toHaveProperty('url')
      expect(result.url).toMatch(/^\/image\/view\//)
    })
  })

  describe('getImage', () => {
    it('should retrieve image successfully', async () => {
      const imageService = new ImageService()
      
      const result = await imageService.getImage('test-uuid', 'test-user')

      expect(result).toBeInstanceOf(Buffer)
    })
  })
})