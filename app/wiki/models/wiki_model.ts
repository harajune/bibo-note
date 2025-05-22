import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, S3Repository } from "../repositories/repositories";
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ArticleListItem {
  uuid: UUID;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export class WikiModel {
  private readonly repository: Repository;
  private readonly cacheFilePath: string;

  constructor() {
    const context = getContext();
    const envVariables = env<{
      MODE: string
    }>(context);
    
    const mode = envVariables.MODE || 'development';
    
    if (mode === 'production') {
      this.repository = new S3Repository();
      this.cacheFilePath = '/tmp/article_list_cache.json';
    } else {
      this.repository = new FileRepository("./data");
      this.cacheFilePath = './cache/article_list_cache.json';
      
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    }
  }

  public async save(wikiData: WikiData): Promise<void> {
    await this.repository.save(wikiData);
    await this.updateCache(wikiData);
  }

  public async load(uuid: string): Promise<WikiData | null> {
    return await this.repository.load(uuid);
  }

  public async list(): Promise<UUID[]> {
    return await this.repository.list();
  }

  public async getLatestArticles(limit = 20): Promise<ArticleListItem[]> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const articleList = JSON.parse(cacheData) as ArticleListItem[];
        return articleList.slice(0, limit);
      }
    } catch (error) {
      console.error('Failed to read cache file:', error);
    }
    
    return await this.rebuildCache(limit);
  }

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
          createdAt: wikiData.createdAt.toISOString()
        });
      }
    }
    
    fs.writeFileSync(this.cacheFilePath, JSON.stringify(articleList), 'utf-8');
    
    return articleList;
  }

  private async updateCache(wikiData: WikiData): Promise<void> {
    try {
      let articleList: ArticleListItem[] = [];
      
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf-8');
        articleList = JSON.parse(cacheData) as ArticleListItem[];
        
        articleList = articleList.filter(item => item.uuid !== wikiData.uuid);
      }
      
      articleList.unshift({
        uuid: wikiData.uuid,
        title: wikiData.title,
        updatedAt: wikiData.updatedAt.toISOString(),
        createdAt: wikiData.createdAt.toISOString()
      });
      
      articleList = articleList.slice(0, 20);
      
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(articleList), 'utf-8');
    } catch (error) {
      console.error('Failed to update cache file:', error);
    }
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    return await this.repository.isExists(uuid);
  }
}
