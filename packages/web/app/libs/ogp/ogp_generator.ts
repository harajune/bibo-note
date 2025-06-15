import { UUID } from '../../wiki/models/wiki_data';

export class OGPGenerator {
  private static readonly WIDTH = 1200;
  private static readonly HEIGHT = 630;
  private static readonly BACKGROUND_COLOR = '#ffffff';
  private static readonly TEXT_COLOR = '#333333';

  public static async generateOGPImage(title: string, uuid: UUID): Promise<Buffer> {
    const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    
    try {
      const { createCanvas, registerFont } = await this.loadCanvas();
      
      await this.registerFonts(registerFont);
      
      const canvas = createCanvas(this.WIDTH, this.HEIGHT);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = this.BACKGROUND_COLOR;
      ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
      
      ctx.fillStyle = this.TEXT_COLOR;
      ctx.font = 'bold 48px "DejaVu Sans", Arial, sans-serif, "Hiragino Sans", "Yu Gothic", "Meiryo", "Takao", "IPAexGothic", "IPAPGothic", "VL PGothic", "Noto Sans CJK JP"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const x = this.WIDTH / 2;
      const y = this.HEIGHT / 2;
      ctx.fillText(displayTitle, x, y);
      
      return canvas.toBuffer('image/png');
    } catch (error) {
      console.warn('Canvas not available, creating placeholder OGP image:', error);
      return Buffer.from(`OGP-${uuid}-${displayTitle}`, 'utf-8');
    }
  }

  private static async loadCanvas(): Promise<any> {
    try {
      return await import('canvas');
    } catch (error) {
      return require('canvas');
    }
  }

  private static async registerFonts(registerFont: any): Promise<void> {
    try {
      const fontPath = '/var/task/fonts/DejaVuSans.ttf';
      registerFont(fontPath, { family: 'DejaVu Sans' });
    } catch (error) {
      console.warn('Font registration failed:', error);
    }
  }

  public static getOGPImageFilename(uuid: UUID): string {
    return `${uuid}.png`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
