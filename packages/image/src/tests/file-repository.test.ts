import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileRepository } from '../repositories/file-repository'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Mock fs module
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn()
}))

describe('FileRepository', () => {
  let fileRepository: FileRepository
  const mockBuffer = Buffer.from('fake-image-data')
  const testUuid = 'test-uuid-123'
  const testUser = 'test-user'

  beforeEach(() => {
    fileRepository = new FileRepository('./test-data')
    vi.clearAllMocks()
  })

  describe('uploadImage', () => {
    it('should create directories and save image file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      
      await fileRepository.uploadImage(testUuid, mockBuffer, testUser)

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('./test-data', testUser, 'images'),
        { recursive: true }
      )
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('./test-data', testUser, 'images', `${testUuid}.png`),
        mockBuffer
      )
    })

    it('should not create directory if it already exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      
      await fileRepository.uploadImage(testUuid, mockBuffer, testUser)

      expect(fs.mkdirSync).not.toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should throw error if file write fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed')
      })

      await expect(fileRepository.uploadImage(testUuid, mockBuffer, testUser))
        .rejects.toThrow('Failed to save image to local file system')
    })
  })

  describe('getImage', () => {
    it('should read and return image file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(mockBuffer)

      const result = await fileRepository.getImage(testUuid, testUser)

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join('./test-data', testUser, 'images', `${testUuid}.png`)
      )
      expect(result).toEqual(mockBuffer)
    })

    it('should throw error if file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await expect(fileRepository.getImage(testUuid, testUser))
        .rejects.toThrow('Image not found')
    })

    it('should throw error if file read fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read failed')
      })

      await expect(fileRepository.getImage(testUuid, testUser))
        .rejects.toThrow('Image not found')
    })
  })
})