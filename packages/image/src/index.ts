import { Hono } from 'hono'
import { contextStorage } from 'hono/context-storage'
import { ImageService } from './services/image-service'

const app = new Hono()
app.use(contextStorage())

// Helper functions to reduce redundancy
const extractUserFromHost = (c: any): string => {
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || ''
  const hostParts = host.split('.')
  return hostParts[0] || 'default'
}

const handleError = (error: unknown, context: string): Response => {
  console.error(`Error ${context}:`, error)
  
  if (error instanceof Error && error.message === 'Image not found') {
    return Response.json({ error: 'Image not found' }, { status: 404 })
  }
  
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}

// Upload images endpoint
app.post('/image/upload', async (c) => {
  try {
    const user = extractUserFromHost(c)
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
    return handleError(error, 'uploading image')
  }
})

// View images endpoint
app.get('/image/view/:uuid', async (c) => {
  try {
    const uuid = c.req.param('uuid')
    
    if (!uuid) {
      return c.json({ error: 'UUID parameter is required' }, 400)
    }

    const user = extractUserFromHost(c)
    const imageService = new ImageService()
    const imageBuffer = await imageService.getImage(uuid, user)

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png'
      },
    })
  } catch (error) {
    return handleError(error, 'retrieving image')
  }
})

export default app