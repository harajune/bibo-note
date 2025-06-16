import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WikiModel } from '../models/wiki-model'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'

vi.mock('../repositories/s3-repository')
vi.mock('../repositories/file-repository')

describe('WikiModel', () => {
  let mockS3Repository: any
  let mockFileRepository: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockS3Repository = {
      load: vi.fn()
    }
    mockFileRepository = {
      load: vi.fn()
    }
    
    vi.mocked(S3Repository).mockImplementation(() => mockS3Repository)
    vi.mocked(FileRepository).mockImplementation(() => mockFileRepository)
  })

  describe('constructor', () => {
    it('should use S3Repository when MODE is production', () => {
      const originalEnv = process.env.MODE
      process.env.MODE = 'production'

      new WikiModel()

      expect(S3Repository).toHaveBeenCalled()
      expect(FileRepository).not.toHaveBeenCalled()

      process.env.MODE = originalEnv
    })

    it('should use FileRepository when MODE is development', () => {
      const originalEnv = process.env.MODE
      process.env.MODE = 'development'

      new WikiModel()

      expect(FileRepository).toHaveBeenCalled()
      expect(S3Repository).not.toHaveBeenCalled()

      process.env.MODE = originalEnv
    })

    it('should default to FileRepository when MODE is not set', () => {
      const originalEnv = process.env.MODE
      delete process.env.MODE

      new WikiModel()

      expect(FileRepository).toHaveBeenCalled()
      expect(S3Repository).not.toHaveBeenCalled()

      process.env.MODE = originalEnv
    })
  })

  describe('load', () => {
    it('should load wiki data through repository', async () => {
      const mockWikiData = {
        uuid: 'test-uuid',
        title: 'Test Title',
        content: 'Test content',
        updatedAt: new Date(),
        createdAt: new Date(),
        isDraft: false
      }

      mockFileRepository.load.mockResolvedValue(mockWikiData)
      const wikiModel = new WikiModel()

      const result = await wikiModel.load('test-uuid', 'testuser')

      expect(result).toBe(mockWikiData)
      expect(mockFileRepository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
    })

    it('should return null when repository returns null', async () => {
      mockFileRepository.load.mockResolvedValue(null)
      const wikiModel = new WikiModel()

      const result = await wikiModel.load('test-uuid', 'testuser')

      expect(result).toBeNull()
      expect(mockFileRepository.load).toHaveBeenCalledWith('test-uuid', 'testuser')
    })
  })
})
