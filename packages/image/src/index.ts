import { Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { ImageService } from './services/image-service'

const app = new Hono()
app.use(contextStorage())

// Upload images endpoint
app.post('/image/upload', async (c) => {
  try {
    const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
    const hostParts = host.split('.')
    const user = hostParts[0] || 'default'

    const body = await c.req.parseBody()
    const file = body['image']

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No image file provided' }, 400)
    }

    const imageService = new ImageService()
    const result = await imageService.uploadImage(file as File, user)

    return c.json({
      success: true,
      uuid: result.uuid,
      url: result.url
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return c.json({ error: 'Failed to upload image' }, 500)
  }
})

// View images endpoint
app.get('/image/view/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid')
    
    if (!uuid) {
      return c.json({ error: 'UUID parameter is required' }, 400)
    }

    const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
    const hostParts = host.split('.')
    const user = hostParts[0] || 'default'

    const imageService = new ImageService()
    const imageBuffer = await imageService.getImage(uuid, user)

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000', // 1 year
      },
    })
  } catch (error) {
    console.error('Error retrieving image:', error)
    
    if (error instanceof Error && error.message === 'Image not found') {
      return c.json({ error: 'Image not found' }, 404)
    }

    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default app