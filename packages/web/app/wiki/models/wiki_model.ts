import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, S3Repository } from "../repositories/repositories";
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import { OGPGenerator } from "../../libs/ogp/ogp_generator";

export interface ArticleListItem {
  uuid: UUID;
  title: string;
  updatedAt: string;
  createdAt: string;
  isDraft: boolean;
}

export class WikiModel {
  private readonly repository: Repository;
  private readonly context: any;

  constructor() {
    this.context = getContext();
    const envVariables = env<{
      MODE: string
    }>(this.context);
    
    const mode = envVariables.MODE || 'development';
    
    if (mode === 'production') {
      this.repository = new S3Repository();
    } else {
      this.repository = new FileRepository("./data");
    }
  }

  public async save(wikiData: WikiData): Promise<void> {
    const ogpImagePath = OGPGenerator.getOGPImageUrl(wikiData.title);
    
    const updatedWikiData = new WikiData(
      wikiData.uuid, 
      wikiData.title, 
      wikiData.content, 
      wikiData.updatedAt, 
      wikiData.createdAt, 
      wikiData.isDraft, 
      ogpImagePath
    );
    
    await this.repository.save(updatedWikiData);
    await this.updateCache(updatedWikiData);
  }

  public async load(uuid: string): Promise<WikiData | null> {
    return await this.repository.load(uuid);
  }

  public async list(): Promise<UUID[]> {
    return await this.repository.list();
  }

  public async getLatestArticles(limit = 20, includeDrafts = false): Promise<ArticleListItem[]> {
    const allArticles = await this.getLatestArticlesInternal(limit);
    if (includeDrafts) {
      return allArticles;
    }
    return allArticles.filter(article => !article.isDraft);
  }

  private async getLatestArticlesInternal(limit = 20): Promise<ArticleListItem[]> {
    try {
      const articleList = await this.repository.loadArticleListCache();
      if (articleList) {
        return articleList.slice(0, limit);
      }
    } catch (error) {
      console.error('Failed to read cache file:', error);
    }
    
    return await this.rebuildCache(limit);
  }

  /**
   * Rebuilds the entire article list cache from scratch by fetching all articles.
   * This is a more expensive operation that loads all articles from storage,
   * sorts them chronologically by UUID (which is UUIDv7), and creates a new cache.
   * Used when the cache doesn't exist or is invalid.
   * 
   * @param limit Maximum number of articles to include in the cache
   * @returns List of article metadata items
   */
  private async rebuildCache(limit = 20): Promise<ArticleListItem[]> {
    const uuids = await this.list();
    
    uuids.sort().reverse();
    
    const articleList: ArticleListItem[] = [];
    
    for (const uuid of uuids.slice(0, limit)) {
      const wikiData = await this.load(uuid);
      if (wikiData) {
        articleList.push({
          uuid: wikiData.uuid,
          title: wikiData.title,
          updatedAt: wikiData.updatedAt.toISOString(),
          createdAt: wikiData.createdAt.toISOString(),
          isDraft: wikiData.isDraft
        });
      }
    }
    
    await this.repository.saveArticleListCache(articleList);
    
    return articleList;
  }

  /**
   * Updates the existing article list cache when a single article is created or modified.
   * This is a more efficient operation than rebuildCache as it only updates the cache
   * for the specific article without loading all articles from storage.
   * It removes the article if it exists in the cache, adds it to the top of the list,
   * and ensures the list doesn't exceed the limit.
   * 
   * @param wikiData The article data to update in the cache
   */
  private async updateCache(wikiData: WikiData): Promise<void> {
    try {
      let articleList: ArticleListItem[] = [];
      const cachedArticles = await this.repository.loadArticleListCache();
      
      if (cachedArticles) {
        articleList = cachedArticles.filter(item => item.uuid !== wikiData.uuid);
      }
      
      articleList.unshift({
        uuid: wikiData.uuid,
        title: wikiData.title,
        updatedAt: wikiData.updatedAt.toISOString(),
        createdAt: wikiData.createdAt.toISOString(),
        isDraft: wikiData.isDraft
      });
      
      articleList = articleList.slice(0, 20);
      
      await this.repository.saveArticleListCache(articleList);
    } catch (error) {
      console.error('Failed to update cache file:', error);
    }
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    return await this.repository.isExists(uuid);
  }
}
