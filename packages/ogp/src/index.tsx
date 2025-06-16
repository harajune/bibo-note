import { ImageResponse } from '@vercel/og';

export type UUID = string;

export class WikiData {
  readonly uuid: UUID;
  readonly title: string;
  readonly content: string;
  readonly updatedAt: Date;
  readonly createdAt: Date;
  readonly isDraft: boolean;

  constructor(uuid: UUID, title: string, content: string, updatedAt: Date, createdAt: Date, isDraft: boolean = false) {
    this.uuid = uuid;
    this.title = title;
    this.content = content;
    this.updatedAt = updatedAt;
    this.createdAt = createdAt;
    this.isDraft = isDraft;
  }
}

import * as TOML from 'smol-toml';
import { S3Client, GetObjectCommand, ListObjectsCommand } from '@aws-sdk/client-s3';

interface OGPResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

class S3Repository {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    this.bucketName = process.env.WIKI_BUCKET_NAME || '';
  }

  async load(uuid: UUID, user: string): Promise<WikiData | null> {
    try {
      const objectKey = `${user}/data/${uuid}.toml`;
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);
      const tomlString = await response.Body?.transformToString();

      if (!tomlString) {
        return null;
      }

      const tomlData = TOML.parse(tomlString) as {
        content: { title: string; content: string };
        header: { updatedAt: string; createdAt: string; isDraft?: boolean };
      };

      return new WikiData(
        uuid,
        tomlData.content.title,
        tomlData.content.content,
        new Date(tomlData.header.updatedAt),
        new Date(tomlData.header.createdAt),
        tomlData.header.isDraft || false
      );
    } catch (error) {
      console.error(`Failed to load wiki data for uuid: ${uuid}`, error);
      return null;
    }
  }
}

class OGPService {
  private repository: S3Repository;

  constructor() {
    this.repository = new S3Repository();
  }

  async generateOGPImage(uuid: UUID, user: string): Promise<Buffer> {
    const wikiData = await this.repository.load(uuid, user);
    
    if (!wikiData) {
      throw new Error('Article not found');
    }

    const truncatedTitle = this.truncateTitle(wikiData.title);

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
    );

    return Buffer.from(await imageResponse.arrayBuffer());
  }

  private truncateTitle(title: string): string {
    const maxLength = 80;
    if (title.length <= maxLength) {
      return title;
    }
    return title.substring(0, maxLength - 3) + '...';
  }
}

export const handler = async (event: any): Promise<OGPResponse> => {
  try {
    const pathParameters = event.pathParameters || {};
    const uuid = pathParameters.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'UUID parameter is required' }),
        isBase64Encoded: false,
      };
    }

    const headers = event.headers || {};
    const host = headers['x-forwarded-host'] || headers['host'] || '';
    const hostParts = host.split('.');
    const user = hostParts[0] || 'default';

    const ogpService = new OGPService();
    const imageBuffer = await ogpService.generateOGPImage(uuid, user);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
      body: imageBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error generating OGP image:', error);
    
    if (error instanceof Error && error.message === 'Article not found') {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Article not found' }),
        isBase64Encoded: false,
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
      isBase64Encoded: false,
    };
  }
};
