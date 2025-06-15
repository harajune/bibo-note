/**
 * Test for draft feature functionality
 * This tests the core draft functionality without running the full app
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikiData } from '../app/wiki/models/wiki_data';
import { WikiModel, ArticleListItem } from '../app/wiki/models/wiki_model';

// Mock the repository and context
vi.mock('hono/context-storage', () => ({
  getContext: () => ({})
}));

vi.mock('hono/adapter', () => ({
  env: () => ({ MODE: 'development' })
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => [])
}));

describe('Draft Feature', () => {
  describe('WikiData', () => {
    it('should create WikiData with draft flag', () => {
      const draftData = new WikiData(
        'test-uuid',
        'Test Title',
        'Test Content',
        new Date(),
        new Date(),
        true
      );
      
      expect(draftData.draft).toBe(true);
    });

    it('should default draft to false when not specified', () => {
      const nonDraftData = new WikiData(
        'test-uuid',
        'Test Title',
        'Test Content',
        new Date(),
        new Date()
      );
      
      expect(nonDraftData.draft).toBe(false);
    });
  });

  describe('WikiModel draft filtering', () => {
    let wikiModel: WikiModel;

    beforeEach(() => {
      vi.clearAllMocks();
      wikiModel = new WikiModel();
    });

    it('should filter out draft articles in view mode', async () => {
      const mockArticles: ArticleListItem[] = [
        {
          uuid: 'uuid1',
          title: 'Published Article',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          draft: false
        },
        {
          uuid: 'uuid2',
          title: 'Draft Article',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          draft: true
        }
      ];

      // Mock the repository cache loading
      vi.spyOn(wikiModel['repository'], 'loadArticleListCache').mockResolvedValue(mockArticles);

      const viewArticles = await wikiModel.getLatestArticlesForView();
      
      expect(viewArticles).toHaveLength(1);
      expect(viewArticles[0].title).toBe('Published Article');
      expect(viewArticles[0].draft).toBe(false);
    });

    it('should include all articles in edit mode', async () => {
      const mockArticles: ArticleListItem[] = [
        {
          uuid: 'uuid1',
          title: 'Published Article',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          draft: false
        },
        {
          uuid: 'uuid2',
          title: 'Draft Article',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          draft: true
        }
      ];

      // Mock the repository cache loading
      vi.spyOn(wikiModel['repository'], 'loadArticleListCache').mockResolvedValue(mockArticles);

      const editArticles = await wikiModel.getLatestArticles();
      
      expect(editArticles).toHaveLength(2);
    });
  });
});