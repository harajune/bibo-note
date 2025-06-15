import { UUID } from '../../wiki/models/wiki_data';

export class OGPGenerator {
  public static getOGPImageUrl(title: string): string {
    const encodedTitle = encodeURIComponent(title);
    return `/ogp?title=${encodedTitle}`;
  }

  public static getOGPImageFilename(uuid: UUID): string {
    return `${uuid}.png`;
  }

  public static async generateOGPImage(title: string, uuid: UUID): Promise<string> {
    return this.getOGPImageUrl(title);
  }
}
