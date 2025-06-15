import { UUID } from '../../wiki/models/wiki_data';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import type { S3Client, PutObjectCommand, HeadObjectCommand } from '../aws-sdk-wrapper';

export interface ImageRepository {
  saveImage(uuid: UUID, imageBuffer: Buffer, filename: string): void | Promise<void>;
  getImagePath(uuid: UUID, filename: string): string;
  imageExists(uuid: UUID, filename: string): boolean | Promise<boolean>;
}

export class FileImageRepository implements ImageRepository {
  private readonly basePath: string;
  private readonly context: any;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.context = getContext();
  }

  private getUserBasePath(): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');

    if (envVariables.MULTITENANT === '1' && user) {
      const userPath = path.join(this.basePath, user);
      if (!fs.existsSync(userPath)) {
        fs.mkdirSync(userPath, { recursive: true });
      }
      return userPath;
    }
    return this.basePath;
  }

  public saveImage(uuid: UUID, imageBuffer: Buffer, filename: string): void {
    const imagePath = this.getImagePath(uuid, filename);
    const imageDir = path.dirname(imagePath);
    
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, imageBuffer);
  }

  public getImagePath(uuid: UUID, filename: string): string {
    const basePath = this.getUserBasePath();
    const imageDir = path.join(basePath, 'OGPimage');
    
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    return path.join(imageDir, filename);
  }

  public imageExists(uuid: UUID, filename: string): boolean {
    return fs.existsSync(this.getImagePath(uuid, filename));
  }
}

export class S3ImageRepository implements ImageRepository {
  private s3Client: any = null;
  private readonly bucketName: string;
  private readonly context: any;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.context = getContext();
  }

  private async ensureClient(): Promise<void> {
    if (!this.s3Client) {
      const S3ClientConstructor = await import('../aws-sdk-wrapper').then(m => m.S3Client);
      this.s3Client = new (await S3ClientConstructor())();
    }
  }

  public async saveImage(uuid: UUID, imageBuffer: Buffer, filename: string): Promise<void> {
    await this.ensureClient();
    const PutObjectCommandConstructor = await import('../aws-sdk-wrapper').then(m => m.PutObjectCommand);
    const objectKey = this.getImageObjectKey(uuid, filename);
    
    await this.s3Client.send(new (await PutObjectCommandConstructor())({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: imageBuffer,
      ContentType: 'image/png'
    }));
  }

  public getImagePath(uuid: UUID, filename: string): string {
    return this.getImageObjectKey(uuid, filename);
  }

  public async imageExists(uuid: UUID, filename: string): Promise<boolean> {
    await this.ensureClient();
    const HeadObjectCommandConstructor = await import('../aws-sdk-wrapper').then(m => m.HeadObjectCommand);
    const objectKey = this.getImageObjectKey(uuid, filename);
    
    try {
      await this.s3Client.send(new (await HeadObjectCommandConstructor())({
        Bucket: this.bucketName,
        Key: objectKey
      }));
      return true;
    } catch {
      return false;
    }
  }

  private getImageObjectKey(uuid: UUID, filename: string): string {
    const envVariables = env<{ MULTITENANT: string }>(this.context);
    const user = this.context.get('user');

    if (envVariables.MULTITENANT === '1' && user) {
      return `${user}/OGPimage/${filename}`;
    }
    return `OGPimage/${filename}`;
  }
}
