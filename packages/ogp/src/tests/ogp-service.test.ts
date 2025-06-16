import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OGPService } from '../services/ogp-service'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'

vi.mock('../repositories/s3-repository')
vi.mock('../repositories/file-repository')

vi.mock('@vercel/og', () => ({
  ImageResponse: vi.fn().mockImplementation(() => ({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1000)),
  })),
}))

describe('OGPService', () => {
  let ogpService: OGPService
  let mockS3Repository: any
  let mockFileRepository: any

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MODE
    
    mockS3Repository = {
      load: vi.fn()
    }
    
    mockFileRepository = {
      load: vi.fn()
    }
    
    vi.mocked(S3Repository).mockImplementation(() => mockS3Repository)
    vi.mocked(FileRepository).mockImplementation(() => mockFileRepository)
    
    ogpService = new OGPService()
  })

  describe('generateOGPImage', () => {
    it('should generate OGP image with article title and user', async () => {
      const mockWikiData = {
        uuid: 'test-uuid',
        title: 'Test Article Title',
        content: 'Test content',
        updatedAt: new Date(),
        createdAt: new Date(),
        isDraft: false
      }

      mockFileRepository.load.mockResolvedValue(mockWikiData)

      const result = await ogpService.generateOGPImage('test-uuid', 'testuser')

      expect(result).toBeInstanceOf(Buffer)
      expect(mockFileRepository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
    })

    it('should throw error when article is not found', async () => {
      mockFileRepository.load.mockResolvedValue(null)

      await expect(ogpService.generateOGPImage('test-uuid', 'testuser')).rejects.toThrow('Article not found')
    })

    it('should truncate long titles', async () => {
      const longTitle = 'This is a very long title that should be truncated because it exceeds the maximum length limit'
      const mockWikiData = {
        uuid: 'test-uuid',
        title: longTitle,
        content: 'Test content',
        updatedAt: new Date(),
        createdAt: new Date(),
        isDraft: false
      }

      mockFileRepository.load.mockResolvedValue(mockWikiData)

      const result = await ogpService.generateOGPImage('test-uuid', 'testuser')

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should use production repository when MODE is production', async () => {
      const originalEnv = process.env.MODE
      process.env.MODE = 'production'

      const service = new OGPService()
      expect(S3Repository).toHaveBeenCalled()

      process.env.MODE = originalEnv
    })

    it('should use development repository when MODE is development', async () => {
      const originalEnv = process.env.MODE
      process.env.MODE = 'development'

      const service = new OGPService()
      expect(FileRepository).toHaveBeenCalled()

      process.env.MODE = originalEnv
    })
  })

  describe('environment-based repository switching', () => {
    it('should create S3Repository in production mode', () => {
      vi.clearAllMocks()
      const originalEnv = process.env.MODE
      process.env.MODE = 'production'

      const service = new OGPService()
      expect(S3Repository).toHaveBeenCalledTimes(1)
      expect(FileRepository).not.toHaveBeenCalled()

      process.env.MODE = originalEnv
    })

    it('should create FileRepository in development mode', () => {
      vi.clearAllMocks()
      const originalEnv = process.env.MODE
      process.env.MODE = 'development'

      const service = new OGPService()
      expect(FileRepository).toHaveBeenCalledTimes(1)
      expect(S3Repository).not.toHaveBeenCalled()

      process.env.MODE = originalEnv
    })
  })
})
