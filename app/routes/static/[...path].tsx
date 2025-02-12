import { createRoute } from 'honox/factory'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client()

export const GET = createRoute(async (c) => {
  const path = c.req.param('path')
  
  try {
    const command = new GetObjectCommand({
      Bucket: 'cloudfrontedgestack-staticsitebucket8958ee3f-icyc9axw3tfc',
      Key: path
    })
    
    const response = await s3Client.send(command)
    
    if (!response.Body) {
      return c.notFound()
    }

    // Content-Typeの設定
    const contentType = response.ContentType || 'application/octet-stream'
    c.header('Content-Type', contentType)

    // Content-Lengthの設定
    if (response.ContentLength) {
      c.header('Content-Length', response.ContentLength.toString())
    }

    // ストリームとしてレスポンスを返す
    return new Response(response.Body.transformToWebStream())
  } catch (error) {
    console.error('Error fetching from S3:', error)
    return c.notFound()
  }
}) 