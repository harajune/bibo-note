import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, S3Repository } from "../repositories/repositories";
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import * as fs from 'node:fs';
import * as path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface ArticleListItem {
  uuid: UUID;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export class WikiModel {
  private readonly repository: Repository;
  private readonly cacheFilePath: string;
  private readonly context: any;
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string | null = null;

  constructor() {
    this.context = getContext();
    const envVariables = env<{
      MODE: string,
      MULTITENANT: string,
      WIKI_BUCKET_NAME: string,
      AWS_REGION: string,
      AWS_ACCESS_KEY_ID: string,
      AWS_SECRET_ACCESS_KEY: string,
      AWS_SESSION_TOKEN: string
    }>(this.context);
    
    const mode = envVariables.MODE || 'development';
    
    if (mode === 'production') {
      this.repository = new S3Repository();
      
      this.bucketName = envVariables.WIKI_BUCKET_NAME;
      this.s3Client = new S3Client({
        region: envVariables.AWS_REGION,
        credentials: {
          accessKeyId: envVariables.AWS_ACCESS_KEY_ID,
          secretAccessKey: envVariables.AWS_SECRET_ACCESS_KEY,
          sessionToken: envVariables.AWS_SESSION_TOKEN,
        }
      });
      
      this.cacheFilePath = this.getCacheFilePath();
    } else {
      this.repository = new FileRepository("./data");
      this.cacheFilePath = this.getCacheFilePath();
      
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    }
  }

  private getCacheFilePath(): string {
    const envVariables = env<{ 
      MODE: string,
      MULTITENANT: string 
    }>(this.context);
    const mode = envVariables.MODE || 'development';
    const user = this.context.get('user');
    const isMultitenant = envVariables.MULTITENANT === '1' && user;
    
    if (mode === 'production') {
      if (isMultitenant) {
        return `${user}/cache/article_list_cache.json`;
      }
      return 'cache/article_list_cache.json';
    } else {
      if (isMultitenant) {
        return `./${user}/cache/article_list_cache.json`;
      }
      return './cache/article_list_cache.json';
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
    const envVariables = env<{ MODE: string }>(this.context);
    const mode = envVariables.MODE || 'development';
    
    try {
      if (mode === 'production' && this.s3Client && this.bucketName) {
        try {
          const response = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: this.cacheFilePath
          }));
          
          const body = await response.Body?.transformToString();
          if (body) {
            const articleList = JSON.parse(body) as ArticleListItem[];
            return articleList.slice(0, limit);
          }
        } catch (error) {
          console.error('Failed to read S3 cache file:', error);
        }
      } else if (fs.existsSync(this.cacheFilePath)) {
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
    const envVariables = env<{ MODE: string }>(this.context);
    const mode = envVariables.MODE || 'development';
    
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
    
    const cacheData = JSON.stringify(articleList);
    
    if (mode === 'production' && this.s3Client && this.bucketName) {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.cacheFilePath,
        Body: cacheData
      }));
    } else {
      const cacheDir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      fs.writeFileSync(this.cacheFilePath, cacheData, 'utf-8');
    }
    
    return articleList;
  }

  private async updateCache(wikiData: WikiData): Promise<void> {
    const envVariables = env<{ MODE: string }>(this.context);
    const mode = envVariables.MODE || 'development';
    
    try {
      let articleList: ArticleListItem[] = [];
      
      if (mode === 'production' && this.s3Client && this.bucketName) {
        try {
          const response = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucketName,
            Key: this.cacheFilePath
          }));
          
          const body = await response.Body?.transformToString();
          if (body) {
            articleList = JSON.parse(body) as ArticleListItem[];
            articleList = articleList.filter(item => item.uuid !== wikiData.uuid);
          }
        } catch (error) {
        }
      } else if (fs.existsSync(this.cacheFilePath)) {
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
      
      const cacheData = JSON.stringify(articleList);
      
      if (mode === 'production' && this.s3Client && this.bucketName) {
        await this.s3Client.send(new PutObjectCommand({
          Bucket: this.bucketName,
          Key: this.cacheFilePath,
          Body: cacheData
        }));
      } else {
        const cacheDir = path.dirname(this.cacheFilePath);
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        fs.writeFileSync(this.cacheFilePath, cacheData, 'utf-8');
      }
    } catch (error) {
      console.error('Failed to update cache file:', error);
    }
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    return await this.repository.isExists(uuid);
  }
}
