import { WikiData, UUID } from "../models/wiki_data";
import * as TOML from 'smol-toml';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Repository {
  save(data: WikiData): void | Promise<void>;
  load(uuid: UUID): WikiData | Promise<WikiData>;
  list(): UUID[] | Promise<UUID[]>;
  isExists(uuid: UUID): boolean | Promise<boolean>;
}

export class FileRepository implements Repository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
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

  public load(uuid: UUID): WikiData {
    const filename = this.getFilePath(uuid);
    const tomlString = fs.readFileSync(filename, 'utf-8');
    const tomlData = TOML.parse(tomlString) as {
      content: { title: string; content: string };
      header: { updatedAt: string; createdAt: string };
    };

    return new WikiData(uuid, tomlData.content.title, tomlData.content.content, new Date(tomlData.header.updatedAt), new Date(tomlData.header.createdAt));
  }

  public list(): UUID[] {
    return [];
  }

  public isExists(uuid: UUID): boolean {
    return fs.existsSync(this.getFilePath(uuid));
  }

  private getFilePath(uuid: UUID): string {
    return path.join(this.filePath, `${uuid}.toml`);
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
    console.log(tomlString);
    console.log(await this.bucket.put(`${data.uuid}.toml`, tomlString));
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
