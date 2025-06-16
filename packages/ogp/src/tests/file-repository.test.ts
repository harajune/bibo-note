import { expect, test, vi, beforeEach, afterEach, describe } from 'vitest'
import { FileRepository } from '../repositories/file-repository'
import { WikiData } from '../repositories/s3-repository'
import * as fs from 'node:fs'
import * as path from 'node:path'

vi.mock('node:fs')
vi.mock('node:path')

const mockFs = vi.mocked(fs)
const mockPath = vi.mocked(path)

describe('FileRepository', () => {
  let fileRepository: FileRepository
  const testFilePath = './test-data'
  const testUser = 'testuser'
  const testUuid = 'test-uuid-123'

  beforeEach(() => {
    vi.clearAllMocks()
    fileRepository = new FileRepository(testFilePath)
    
    mockPath.join.mockImplementation((...args) => args.join('/'))
    mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should save wiki data to file', () => {
    const mockWikiData = new WikiData(
      testUuid,
      'Test Title',
      'Test content',
      new Date('2023-01-01T00:00:00Z'),
      new Date('2023-01-01T00:00:00Z'),
      false
    )

    mockFs.existsSync.mockReturnValue(true)
    mockFs.writeFileSync.mockImplementation(() => {})

    fileRepository.save(mockWikiData, testUser)

    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(`${testUser}/data/${testUuid}.toml`),
      expect.stringContaining('Test Title'),
      'utf-8'
    )
  })

  test('should load wiki data from file', async () => {
    const mockTomlContent = `
[header]
fileVersion = "0.0.1"
updatedAt = "2023-01-01T00:00:00.000Z"
createdAt = "2023-01-01T00:00:00.000Z"
uuid = "${testUuid}"
isDraft = false

[content]
title = "Test Title"
content = "Test content"
`

    mockFs.readFileSync.mockReturnValue(mockTomlContent)

    const result = await fileRepository.load(testUuid, testUser)

    expect(result).toBeInstanceOf(WikiData)
    expect(result?.title).toBe('Test Title')
    expect(result?.content).toBe('Test content')
    expect(result?.uuid).toBe(testUuid)
  })

  test('should return null when file does not exist', async () => {
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found')
    })

    const result = await fileRepository.load('nonexistent-uuid', testUser)

    expect(result).toBeNull()
  })

  test('should check if file exists', () => {
    mockFs.existsSync.mockReturnValue(true)

    const exists = fileRepository.isExists(testUuid, testUser)

    expect(exists).toBe(true)
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining(`${testUser}/data/${testUuid}.toml`)
    )
  })

  test('should list files in directory', () => {
    mockFs.existsSync.mockReturnValue(true)
    mockFs.readdirSync.mockReturnValue(['file1.toml', 'file2.toml', 'file3.txt'] as any)

    const result = fileRepository.list(testUser)

    expect(result).toEqual(['file1', 'file2'])
    expect(mockFs.readdirSync).toHaveBeenCalledWith(
      expect.stringContaining(`${testUser}/data`)
    )
  })

  test('should return empty array when data directory does not exist', () => {
    mockFs.existsSync.mockReturnValue(false)

    const result = fileRepository.list(testUser)

    expect(result).toEqual([])
  })
})
