import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { ImageResponse } from '@vercel/og'
import { S3Repository, WikiData, UUID } from './repositories/s3-repository'

const app = new Hono()

class OGPService {
  private repository: S3Repository

  constructor() {
    this.repository = new S3Repository()
  }

  async generateOGPImage(uuid: UUID, user: string): Promise<Buffer> {
    const wikiData = await this.repository.load(uuid, user)
    
    if (!wikiData) {
      throw new Error('Article not found')
    }

    const truncatedTitle = this.truncateTitle(wikiData.title)

    const imageResponse = new ImageResponse(
      (
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
                fontSize: 24,
                color: '#6b7280',
                fontWeight: 400,
              }}
            >
              by {user}
            </div>
          </div>
        </div>
      ),
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

app.get('/ogp/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid')
    
    if (!uuid) {
      return c.json({ error: 'UUID parameter is required' }, 400)
    }

    const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
    const hostParts = host.split('.')
    const user = hostParts[0] || 'default'

    const ogpService = new OGPService()
    const imageBuffer = await ogpService.generateOGPImage(uuid, user)

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error generating OGP image:', error)
    
    if (error instanceof Error && error.message === 'Article not found') {
      return c.json({ error: 'Article not found' }, 404)
    }

    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default handle(app)
