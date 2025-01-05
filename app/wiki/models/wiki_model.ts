import { WikiData, UUID } from "./wiki_data";
import { Repository, FileRepository } from "../repositories/repositories";

export class WikiModel {
  private readonly repository: Repository;

  constructor() {
    this.repository = new FileRepository("./data");
  }

  public save(wikiData: WikiData) {
    this.repository.save(wikiData);
  }

  public load(uuid: string): WikiData {
    return this.repository.load(uuid);
  }

  public list(): UUID[] {
    return this.repository.list();
  }

  public isExists(uuid: UUID): boolean {
    return this.repository.isExists(uuid);
  }

}
