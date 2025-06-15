import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WikiModel } from '../app/wiki/models/wiki_model';
import { WikiData } from '../app/wiki/models/wiki_data';
import * as fs from 'node:fs';
import { v7 as uuidv7 } from "uuid";

vi.mock('hono/context-storage', () => ({
  getContext: vi.fn(() => ({
    get: vi.fn((key) => key === 'user' ? 'test-user' : null)
  }))
}));

vi.mock('hono/adapter', () => ({
  env: vi.fn(() => ({ 
    MODE: 'development',
    MULTITENANT: '0'
  }))
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn()
  };
});

describe('Article Posting', () => {
  let wikiModel: WikiModel;
  let testUuid: string;
  let testData: WikiData;
  
  beforeEach(() => {
    wikiModel = new WikiModel();
    testUuid = uuidv7();
    testData = new WikiData(
      testUuid,
      'Test Title',
      'Test Content',
      new Date(),
      new Date(),
      false
    );
    
    vi.clearAllMocks();
  });
  
  it('should save an article to the file repository', async () => {
    await wikiModel.save(testData);
    
    expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    
    const ogpImageArg = (fs.writeFileSync as any).mock.calls[0][0];
    expect(ogpImageArg).toContain(testUuid);
    expect(ogpImageArg).toContain('.png');
    
    const tomlFileArg = (fs.writeFileSync as any).mock.calls[1][0];
    expect(tomlFileArg).toContain(testUuid);
    expect(tomlFileArg).toContain('.toml');
    
    const tomlContentArg = (fs.writeFileSync as any).mock.calls[1][1];
    expect(tomlContentArg).toContain('Test Title');
    expect(tomlContentArg).toContain('Test Content');
    expect(tomlContentArg).toContain('isDraft = false');
    expect(tomlContentArg).toContain('ogpImagePath');
  });
  
  it('should check if an article exists', async () => {
    (fs.existsSync as any).mockImplementation((path: string) => {
      return path.includes(testUuid);
    });
    
    const exists = await wikiModel.isExists(testUuid);
    expect(exists).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledTimes(2);
    
    const path = (fs.existsSync as any).mock.calls[1][0];
    expect(path).toContain(testUuid);
  });
  
  it('should load an article from the file repository', async () => {
    const tomlContent = `
    [header]
    fileVersion = "0.0.1"
    updatedAt = "${new Date().toISOString()}"
    createdAt = "${new Date().toISOString()}"
    uuid = "${testUuid}"
    isDraft = false
    
    [content]
    title = "Test Title"
    content = "Test Content"
    `;
    
    (fs.readFileSync as any).mockReturnValueOnce(tomlContent);
    (fs.existsSync as any).mockReturnValueOnce(true);
    
    const loadedData = await wikiModel.load(testUuid);
    
    expect(loadedData).not.toBeNull();
    expect(loadedData?.uuid).toBe(testUuid);
    expect(loadedData?.title).toBe('Test Title');
    expect(loadedData?.content).toBe('Test Content');
    expect(loadedData?.isDraft).toBe(false);
  });
  
  it('should return null when loading a non-existent article', async () => {
    (fs.readFileSync as any).mockImplementationOnce(() => {
      throw new Error('File not found');
    });
    
    const loadedData = await wikiModel.load('non-existent-uuid');
    
    expect(loadedData).toBeNull();
  });
});
