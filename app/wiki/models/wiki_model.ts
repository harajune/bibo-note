import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository, S3Repository } from "../repositories/repositories";

export class WikiModel {
  private readonly repository: Repository;

  constructor() {
    const mode = process.env.MODE || import.meta.env?.MODE || 'development';
    
    if (mode === 'production') {
      this.repository = new S3Repository();
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
