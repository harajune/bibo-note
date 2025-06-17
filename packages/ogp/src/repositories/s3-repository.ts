import * as TOML from 'smol-toml';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Repository, WikiData, UUID } from './repository';
import { env } from 'hono/adapter';
import { getContext } from 'hono/context-storage';

export class S3Repository implements Repository {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const context = getContext();
    const enviromentVariables = env<{
      WIKI_BUCKET_NAME: string,
      AWS_REGION: string,
      AWS_ACCESS_KEY_ID: string,
      AWS_SECRET_ACCESS_KEY: string,
      AWS_SESSION_TOKEN: string,
      MULTITENANT: string
    }>(context);

    this.s3Client = new S3Client({
      region: enviromentVariables.AWS_REGION,
      credentials: {
        accessKeyId: enviromentVariables.AWS_ACCESS_KEY_ID,
        secretAccessKey: enviromentVariables.AWS_SECRET_ACCESS_KEY,
        sessionToken: enviromentVariables.AWS_SESSION_TOKEN,
      },
    });
    this.bucketName = enviromentVariables.WIKI_BUCKET_NAME;
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
