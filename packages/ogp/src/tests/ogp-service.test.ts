import { expect, test, vi, beforeEach, describe } from 'vitest'
import { OGPService } from '../services/ogp-service'
import { WikiData } from '../repositories/s3-repository'

vi.mock('../repositories/s3-repository', () => ({
  S3Repository: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
  })),
  WikiData: class {
    constructor(
      public uuid: string,
      public title: string,
      public content: string,
      public updatedAt: Date,
      public createdAt: Date,
      public isDraft: boolean = false
    ) {}
  },
}))

vi.mock('../repositories/file-repository', () => ({
  FileRepository: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
  })),
}))

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
    ogpService = new OGPService()
    mockS3Repository = (ogpService as any).s3Repository
    mockFileRepository = (ogpService as any).fileRepository
  })

  test('should generate OGP image successfully with S3 repository', async () => {
    const mockWikiData = new WikiData(
      'test-uuid',
      'Test Article Title',
      'Test content',
      new Date('2023-01-01'),
      new Date('2023-01-01'),
      false
    )

    mockS3Repository.load.mockResolvedValue(mockWikiData)

    const result = await ogpService.generateOGPImage('test-uuid', 'testuser')

    expect(result).toBeInstanceOf(Buffer)
    expect(mockS3Repository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
  })

  test('should fallback to file repository when S3 fails', async () => {
    const mockWikiData = new WikiData(
      'test-uuid',
      'Test Article Title',
      'Test content',
      new Date('2023-01-01'),
      new Date('2023-01-01'),
      false
    )

    mockS3Repository.load.mockRejectedValue(new Error('S3 error'))
    mockFileRepository.load.mockResolvedValue(mockWikiData)

    const result = await ogpService.generateOGPImage('test-uuid', 'testuser')

    expect(result).toBeInstanceOf(Buffer)
    expect(mockS3Repository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
    expect(mockFileRepository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
  })

  test('should throw error when article not found', async () => {
    mockS3Repository.load.mockResolvedValue(null)
    mockFileRepository.load.mockResolvedValue(null)

    await expect(
      ogpService.generateOGPImage('nonexistent-uuid', 'testuser')
    ).rejects.toThrow('Article not found')
  })

  test('should truncate long titles', async () => {
    const longTitle = 'A'.repeat(100)
    const mockWikiData = new WikiData(
      'test-uuid',
      longTitle,
      'Test content',
      new Date('2023-01-01'),
      new Date('2023-01-01'),
      false
    )

    mockS3Repository.load.mockResolvedValue(mockWikiData)

    await ogpService.generateOGPImage('test-uuid', 'testuser')

    expect(mockS3Repository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
  })
})
