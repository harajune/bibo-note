import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, R2Repository } from "../repositories/repositories";

export class WikiModel {
  private readonly repository: Repository;

  constructor({bucket}: {bucket?: R2Bucket}) {
    const mode = process.env.MODE || import.meta.env?.MODE || 'development';
    
    if (mode === 'production') {
      if (!bucket) {
        throw new Error('R2 bucket is required in production mode');
      }
      this.repository = new R2Repository(bucket);
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
