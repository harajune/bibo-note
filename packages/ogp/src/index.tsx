import { Hono } from 'hono'
import { OGPService } from './services/ogp-service'
import { contextStorage } from 'hono/context-storage'

const app = new Hono()
app.use(contextStorage())

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

export default app
