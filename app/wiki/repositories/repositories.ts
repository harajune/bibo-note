import { WikiData, UUID } from "../models/wiki_data";
import * as TOML from 'smol-toml';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import { logger } from "../../libs/logger/logger";
export interface Repository {
  save(data: WikiData): void | Promise<void>;
  load(uuid: UUID): WikiData | Promise<WikiData | null>;
  list(): UUID[] | Promise<UUID[]>;
  isExists(uuid: UUID): boolean | Promise<boolean>;
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
        uuid: data.uuid
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
        header: { updatedAt: string; createdAt: string };
      };
      return new WikiData(uuid, tomlData.content.title, tomlData.content.content, new Date(tomlData.header.updatedAt), new Date(tomlData.header.createdAt));
    } catch (e) {
      logger.error(`Failed to load wiki data for filename: ${filename}`);
      return null;
    }
  }

  public list(): UUID[] {
    const basePath = this.getUserBasePath();
    if (!fs.existsSync(basePath)) {
      return [];
    }
    const files = fs.readdirSync(basePath).filter(file => file.endsWith('.toml'));
    return files.map(file => file.replace('.toml', ''));
  }

  public isExists(uuid: UUID): boolean {
    return fs.existsSync(this.getFilePath(uuid));
  }

  private getFilePath(uuid: UUID): string {
    return path.join(this.getUserBasePath(), `${uuid}.toml`);
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
        uuid: data.uuid
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
      header: { updatedAt: string; createdAt: string };
    };

    return new WikiData(
      uuid,
      tomlData.content.title,
      tomlData.content.content,
      new Date(tomlData.header.updatedAt),
      new Date(tomlData.header.createdAt)
    );
  }

  public async list(): Promise<UUID[]> {
    return []; // Not implemented yet as per plan
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    const object = await this.bucket.head(`${uuid}.toml`);
    return object !== null;
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
  private readonly s3Client: S3Client;
  private readonly context: any;

  constructor() {
    // get enviroment variables from context
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

    // s3 is same region as lambda
    this.s3Client = new S3Client({
      region: enviromentVariables.AWS_REGION,
      credentials: {
        accessKeyId: enviromentVariables.AWS_ACCESS_KEY_ID,
        secretAccessKey: enviromentVariables.AWS_SECRET_ACCESS_KEY,
        sessionToken: enviromentVariables.AWS_SESSION_TOKEN,
      }
    });
  }

  private getObjectKey(uuid: UUID): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/${uuid}.toml`;
    }
    return `${uuid}.toml`;
  }

  public async save(data: WikiData): Promise<void> {
    const tomlData = {
      header: {
        fileVersion: "0.0.1",
        updatedAt: data.updatedAt.toISOString(),
        createdAt: data.createdAt.toISOString(),
        uuid: data.uuid,
      },
      content: {
        title: data.title,
        content: data.content,
      }
    };
    const tomlString = TOML.stringify(tomlData);
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: this.getObjectKey(data.uuid),
      Body: tomlString
    }));
  }

  public async load(uuid: UUID): Promise<WikiData | null> {
    const objectKey = this.getObjectKey(uuid);
    try {
      const res = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      }));
      const body = await res.Body?.transformToString();
      if (!body) {
        throw new Error(`ObjectKey ${objectKey} is not found`);
      }
      const tomlData = TOML.parse(body) as {
        content: { title: string; content: string };
        header: { updatedAt: string; createdAt: string };
      };
      return new WikiData(
        uuid,
        tomlData.content.title,
        tomlData.content.content,
        new Date(tomlData.header.updatedAt),
        new Date(tomlData.header.createdAt)
      );
    } catch (e) {
      logger.error(`Failed to load wiki data for objectKey: ${objectKey}`);
      return null;
    }
  }

  public async list(): Promise<UUID[]> {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');
    const prefix = envVariables.MULTITENANT === '1' && user ? `${user}/` : '';

    const res = await this.s3Client.send(new ListObjectsCommand({
      Bucket: this.bucketName,
      Prefix: prefix
    }));
    if (!res.Contents) return [];
    return res.Contents
      .filter(item => item.Key && item.Key.endsWith('.toml'))
      .map(item => {
        const key = item.Key!;
        return key.substring(key.lastIndexOf('/') + 1).replace('.toml', '');
      });
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: this.getObjectKey(uuid),
      }));
      return true;
    } catch (e) {
      return false;
    }
  }
}
