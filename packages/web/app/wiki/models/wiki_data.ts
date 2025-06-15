
export type UUID = string;

export class WikiData {
  readonly uuid: UUID;
  readonly title: string;
  readonly content: string;
  readonly updatedAt: Date;
  readonly createdAt: Date;

  constructor(uuid: UUID, title: string, content: string, updatedAt: Date, createdAt: Date) {
    this.uuid = uuid;
    this.title = title;
    this.content = content;
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
  }
}
