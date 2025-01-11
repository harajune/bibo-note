import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, R2Repository } from "../repositories/repositories";
import type { R2Bucket } from '@cloudflare/workers-types';

export class WikiModel {
  private readonly repository: Repository;

  constructor(env?: { MY_BUCKET?: R2Bucket }) {
    const mode = import.meta.env?.PROD ? 'production' : 'development';
    
    if (mode === 'production') {
      if (!env?.MY_BUCKET) {
        throw new Error('R2 bucket is required in production mode');
      }
      this.repository = new R2Repository(env.MY_BUCKET);
    } else {
      this.repository = new FileRepository("./data");
    }
  }

  public async save(wikiData: WikiData): Promise<void> {
    await this.repository.save(wikiData);
  }

  public async load(uuid: string): Promise<WikiData> {
    return await this.repository.load(uuid);
  }

  public async list(): Promise<UUID[]> {
    return await this.repository.list();
  }

  public async isExists(uuid: UUID): Promise<boolean> {
    return await this.repository.isExists(uuid);
  }

}
