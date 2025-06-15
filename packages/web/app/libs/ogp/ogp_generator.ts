import { UUID } from '../../wiki/models/wiki_data';

export class OGPGenerator {
  private static readonly WIDTH = 1200;
  private static readonly HEIGHT = 630;
  private static readonly BACKGROUND_COLOR = '#ffffff';
  private static readonly TEXT_COLOR = '#333333';

  public static async generateOGPImage(title: string, uuid: UUID): Promise<Buffer> {
    const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    
    const svg = `
      <svg width="${this.WIDTH}" height="${this.HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${this.BACKGROUND_COLOR}"/>
        <text x="50%" y="50%" 
              font-family="Arial, sans-serif, 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP'" 
              font-size="48" 
              font-weight="bold" 
              fill="${this.TEXT_COLOR}" 
              text-anchor="middle" 
              dominant-baseline="middle"
              textLength="90%" 
              lengthAdjust="spacingAndGlyphs">
          ${this.escapeXml(displayTitle)}
        </text>
      </svg>
    `;

    try {
      const sharp = (await import('sharp')).default;
      return await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
    } catch (error) {
      console.warn('Sharp not available, creating placeholder OGP image');
      return Buffer.from(`OGP-${uuid}-${displayTitle}`, 'utf-8');
    }
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public static getOGPImageFilename(uuid: UUID): string {
    return `${uuid}.png`;
  }
}
