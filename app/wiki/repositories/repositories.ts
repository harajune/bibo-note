import { WikiData, UUID } from "../models/wiki_data";
import * as TOML from 'smol-toml';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Repository {
  save(data: WikiData): void;
  load(uuid: UUID): WikiData;
  list(): UUID[];
}

export class FileRepository implements Repository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public save(data: WikiData): void {
    const filename = path.join(this.filePath, `${data.uuid}.toml`);

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
    const filename = path.join(this.filePath, `${uuid}.toml`);
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
}