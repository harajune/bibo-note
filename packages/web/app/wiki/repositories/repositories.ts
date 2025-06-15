import { WikiData, UUID } from "../models/wiki_data";
import * as TOML from 'smol-toml';
import * as fs from 'node:fs';
import * as path from 'node:path';
// Use the wrapper to avoid CommonJS issues
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand, HeadObjectCommand } from '../../libs/aws-sdk-wrapper';
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import { logger } from "../../libs/logger/logger";
import { ArticleListItem } from "../models/wiki_model";
export interface Repository {
  save(data: WikiData): void | Promise<void>;
  load(uuid: UUID): WikiData | Promise<WikiData | null>;
  list(): UUID[] | Promise<UUID[]>;
  isExists(uuid: UUID): boolean | Promise<boolean>;
  
  saveArticleListCache(articles: ArticleListItem[]): void | Promise<void>;
  loadArticleListCache(): Promise<ArticleListItem[] | null>;
  getCacheFilePath(): string;
}

export class FileRepository implements Repository {
  private readonly filePath: string;
  private readonly context: any;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.context = getContext();
  }

  private getUserBasePath(): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');

    if (envVariables.MULTITENANT === '1' && user) {
      const userPath = path.join(this.filePath, user);
      // ユーザーディレクトリが存在しない場合は作成
      if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
      }
      return userPath;
    }
    return this.filePath;
  }

  public save(data: WikiData): void {
    const filename = this.getFilePath(data.uuid);

    const tomlData = {
      header: {
        fileVersion: "0.0.1",
        updatedAt: data.updatedAt.toISOString(),
        createdAt: data.createdAt.toISOString(),
        uuid: data.uuid,
        isDraft: data.isDraft
      },
      content: {
        title: data.title,
        content: data.content
      }
    };

    const tomlString = TOML.stringify(tomlData);
    fs.writeFileSync(filename, tomlString, 'utf-8');
  }

  public async load(uuid: UUID): Promise<WikiData | null> {
    const filename = this.getFilePath(uuid);
    try {
      const tomlString = fs.readFileSync(filename, 'utf-8');
      if (!tomlString) {
        return null;
      }
      const tomlData = TOML.parse(tomlString) as {
        content: { title: string; content: string };
        header: { updatedAt: string; createdAt: string; isDraft?: boolean };
      };
      return new WikiData(uuid, tomlData.content.title, tomlData.content.content, new Date(tomlData.header.updatedAt), new Date(tomlData.header.createdAt), tomlData.header.isDraft || false);
    } catch (e) {
      logger.error(`Failed to load wiki data for filename: ${filename}`);
      return null;
    }
  }

  public list(): UUID[] {
    const basePath = this.getUserBasePath();
    const files = fs.readdirSync(basePath);
    return files
      .filter(file => file.endsWith('.toml'))
      .map(file => file.replace('.toml', ''));
  }

  public isExists(uuid: UUID): boolean {
    return fs.existsSync(this.getFilePath(uuid));
  }

  private getFilePath(uuid: UUID): string {
    const basePath = this.getUserBasePath();
    const dataDir = path.join(basePath, 'data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    return path.join(dataDir, `${uuid}.toml`);
  }
  
  public getCacheFilePath(): string {
    const basePath = this.getUserBasePath();
    return path.join(basePath, 'cache', 'article_list_cache.json');
  }
  
  public async saveArticleListCache(articles: ArticleListItem[]): Promise<void> {
    const cacheFilePath = this.getCacheFilePath();
    const cacheDir = path.dirname(cacheFilePath);
    
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    fs.writeFileSync(cacheFilePath, JSON.stringify(articles), 'utf-8');
  }
  
  public async loadArticleListCache(): Promise<ArticleListItem[] | null> {
    const cacheFilePath = this.getCacheFilePath();
    
    try {
      if (fs.existsSync(cacheFilePath)) {
        const cacheData = fs.readFileSync(cacheFilePath, 'utf-8');
        return JSON.parse(cacheData) as ArticleListItem[];
      }
    } catch (error) {
      console.error('Failed to read cache file:', error);
    }
    
    return null;
  }
}

export class R2Repository implements Repository {
  private readonly bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  public async save(data: WikiData): Promise<void> {
    const tomlData = {
      header: {
        fileVersion: "0.0.1",
        updatedAt: data.updatedAt.toISOString(),
        createdAt: data.createdAt.toISOString(),
        uuid: data.uuid,
        isDraft: data.isDraft
      },
      content: {
        title: data.title,
        content: data.content
      }
    };

    const tomlString = TOML.stringify(tomlData);
    await this.bucket.put(`${data.uuid}.toml`, tomlString);
  }

  public async load(uuid: UUID): Promise<WikiData> {
    const object = await this.bucket.get(`${uuid}.toml`);
    if (!object) {
      throw new Error(`Wiki data not found for UUID: ${uuid}`);
    }

    const tomlString = await object.text();
    const tomlData = TOML.parse(tomlString) as {
      content: { title: string; content: string };
      header: { updatedAt: string; createdAt: string; isDraft?: boolean };
    };

    return new WikiData(
      uuid,
      tomlData.content.title,
      tomlData.content.content,
      new Date(tomlData.header.updatedAt),
      new Date(tomlData.header.createdAt),
      tomlData.header.isDraft || false
    );
  }

  public async list(): Promise<UUID[]> {
    return []; // Not implemented yet as per plan
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    const object = await this.bucket.head(`${uuid}.toml`);
    return object !== null;
  }
  
  public getCacheFilePath(): string {
    return 'cache/article_list_cache.json';
  }
  
  public async saveArticleListCache(articles: ArticleListItem[]): Promise<void> {
    await this.bucket.put(this.getCacheFilePath(), JSON.stringify(articles));
  }
  
  public async loadArticleListCache(): Promise<ArticleListItem[] | null> {
    try {
      const object = await this.bucket.get(this.getCacheFilePath());
      if (!object) {
        return null;
      }
      
      const cacheData = await object.text();
      return JSON.parse(cacheData) as ArticleListItem[];
    } catch (error) {
      console.error('Failed to read cache file:', error);
      return null;
    }
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export class S3Repository implements Repository {
  private readonly bucketName: string;
  private s3Client: any | null = null;
  private readonly context: any;
  private readonly envVars: {
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_SESSION_TOKEN: string;
  };

  constructor() {
    // get environment variables from context
    this.context = getContext();
    const enviromentVariables = env<{
      WIKI_BUCKET_NAME: string,
      AWS_REGION: string,
      AWS_ACCESS_KEY_ID: string,
      AWS_SECRET_ACCESS_KEY: string,
      AWS_SESSION_TOKEN: string,
      MULTITENANT: string
    }>(this.context);

    const bucketName = enviromentVariables.WIKI_BUCKET_NAME;

    if (!bucketName) {
      throw new Error('WIKI_BUCKET_NAME environment variable is not set.');
    }
    this.bucketName = bucketName;
    this.envVars = {
      AWS_REGION: enviromentVariables.AWS_REGION,
      AWS_ACCESS_KEY_ID: enviromentVariables.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: enviromentVariables.AWS_SECRET_ACCESS_KEY,
      AWS_SESSION_TOKEN: enviromentVariables.AWS_SESSION_TOKEN,
    };
  }

  private async ensureClient() {
    if (!this.s3Client) {
      // Get S3Client constructor from wrapper
      const S3ClientConstructor = await S3Client();
      this.s3Client = new S3ClientConstructor({
        region: this.envVars.AWS_REGION,
        credentials: {
          accessKeyId: this.envVars.AWS_ACCESS_KEY_ID,
          secretAccessKey: this.envVars.AWS_SECRET_ACCESS_KEY,
          sessionToken: this.envVars.AWS_SESSION_TOKEN,
        },
      });
    }
  }

  private getObjectKey(uuid: UUID): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/data/${uuid}.toml`;
    }
    return `data/${uuid}.toml`;
  }

  public async save(data: WikiData): Promise<void> {
    await this.ensureClient();
    // Get PutObjectCommand constructor
    const PutObjectCommandConstructor = await PutObjectCommand();
    const tomlData = {
      header: {
        fileVersion: "0.0.1",
        updatedAt: data.updatedAt.toISOString(),
        createdAt: data.createdAt.toISOString(),
        uuid: data.uuid,
        isDraft: data.isDraft
      },
      content: {
        title: data.title,
        content: data.content,
      }
    };
    const tomlString = TOML.stringify(tomlData);
    await this.s3Client!.send(new PutObjectCommandConstructor({
      Bucket: this.bucketName,
      Key: this.getObjectKey(data.uuid),
      Body: tomlString
    }));
  }

  public async load(uuid: UUID): Promise<WikiData | null> {
    await this.ensureClient();
    // Get GetObjectCommand constructor
    const GetObjectCommandConstructor = await GetObjectCommand();
    const objectKey = this.getObjectKey(uuid);
    try {
      const res = await this.s3Client!.send(new GetObjectCommandConstructor({
        Bucket: this.bucketName,
        Key: objectKey,
      }));
      const body = await res.Body?.transformToString();
      if (!body) {
        throw new Error(`ObjectKey ${objectKey} is not found`);
      }
      const tomlData = TOML.parse(body) as {
        content: { title: string; content: string };
        header: { updatedAt: string; createdAt: string; isDraft?: boolean };
      };
      return new WikiData(
        uuid,
        tomlData.content.title,
        tomlData.content.content,
        new Date(tomlData.header.updatedAt),
        new Date(tomlData.header.createdAt),
        tomlData.header.isDraft || false
      );
    } catch (e) {
      logger.error(`Failed to load wiki data for objectKey: ${objectKey}`);
      return null;
    }
  }

  public async list(): Promise<UUID[]> {
    await this.ensureClient();
    // Get ListObjectsCommand constructor
    const ListObjectsCommandConstructor = await ListObjectsCommand();
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');
    const prefix = envVariables.MULTITENANT === '1' && user ? `${user}/data/` : 'data/';

    const res = await this.s3Client!.send(new ListObjectsCommandConstructor({
      Bucket: this.bucketName,
      Prefix: prefix
    }));
    if (!res.Contents) return [];
    return res.Contents
      .filter((item: any) => item.Key && item.Key.endsWith('.toml'))
      .map((item: any) => {
        const key = item.Key!;
        return key.substring(key.lastIndexOf('/') + 1).replace('.toml', '');
      });
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    await this.ensureClient();
    // Get HeadObjectCommand constructor
    const HeadObjectCommandConstructor = await HeadObjectCommand();
    try {
      await this.s3Client!.send(new HeadObjectCommandConstructor({
        Bucket: this.bucketName,
        Key: this.getObjectKey(uuid),
      }));
      return true;
    } catch (e) {
      return false;
    }
  }
  
  public getCacheFilePath(): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');
    
    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/cache/article_list_cache.json`;
    }
    return `cache/article_list_cache.json`;
  }
  
  public async saveArticleListCache(articles: ArticleListItem[]): Promise<void> {
    await this.ensureClient();
    const PutObjectCommandConstructor = await PutObjectCommand();
    await this.s3Client!.send(new PutObjectCommandConstructor({
      Bucket: this.bucketName,
      Key: this.getCacheFilePath(),
      Body: JSON.stringify(articles)
    }));
  }
  
  public async loadArticleListCache(): Promise<ArticleListItem[] | null> {
    await this.ensureClient();
    try {
      const GetObjectCommandConstructor = await GetObjectCommand();
      const response = await this.s3Client!.send(new GetObjectCommandConstructor({
        Bucket: this.bucketName,
        Key: this.getCacheFilePath()
      }));
      
      const body = await response.Body?.transformToString();
      if (body) {
        return JSON.parse(body) as ArticleListItem[];
      }
    } catch (error) {
      console.error('Failed to read S3 cache file:', error);
    }
    
    return null;
  }
}
