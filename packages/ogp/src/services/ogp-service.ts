import { ImageResponse } from '@vercel/og'
import { S3Repository, WikiData, UUID } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'
import React from 'react'

export class OGPService {
  private s3Repository: S3Repository
  private fileRepository: FileRepository

  constructor() {
    this.s3Repository = new S3Repository()
    this.fileRepository = new FileRepository()
  }

  async generateOGPImage(uuid: UUID, user: string): Promise<Buffer> {
    let wikiData: WikiData | null = null
    
    try {
      wikiData = await this.s3Repository.load(uuid, user)
    } catch (error) {
      console.warn('S3 repository failed, trying file repository:', error)
      wikiData = await this.fileRepository.load(uuid, user)
    }
    
    if (!wikiData) {
      throw new Error('Article not found')
    }

    const truncatedTitle = this.truncateTitle(wikiData.title)

    const imageResponse = new ImageResponse(
      React.createElement(
        'div',
        {
          style: {
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
          }
        },
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              maxWidth: '90%',
            }
          },
          React.createElement(
            'div',
            {
              style: {
                fontSize: 48,
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '20px',
                lineHeight: 1.2,
              }
            },
            truncatedTitle
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 24,
                color: '#6b7280',
                fontWeight: 400,
              }
            },
            `by ${user}`
          )
        )
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
