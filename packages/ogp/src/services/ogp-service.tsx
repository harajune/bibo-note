import { ImageResponse } from '@vercel/og'
import { UUID } from '../repositories/repository'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'
import { WikiModel } from '../models/wiki-model'

export class OGPService {
  private wikiModel: WikiModel

  constructor() {
    this.wikiModel = new WikiModel()
  }

  async generateOGPImage(uuid: UUID, user: string): Promise<Buffer> {
    const wikiData = await this.wikiModel.load(uuid, user)
    
    if (!wikiData) {
      throw new Error('Article not found')
    }

    const truncatedTitle = this.truncateTitle(wikiData.title)

    const imageResponse = new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          fontSize: 32,
          fontWeight: 600,
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            maxWidth: '90%',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 48,
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '20px',
              lineHeight: 1.2,
            }}
          >
            {truncatedTitle}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: '#6b7280',
              fontWeight: 400,
            }}
          >
            by {user}
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      }
    )

    return Buffer.from(await imageResponse.arrayBuffer())
  }

  private truncateTitle(title: string): string {
    const maxLength = 80
    if (title.length <= maxLength) {
      return title
    }
    return title.substring(0, maxLength - 3) + '...'
  }
}
