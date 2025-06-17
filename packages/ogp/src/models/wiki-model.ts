import { Repository, WikiData, UUID } from '../repositories/repository'
import { S3Repository } from '../repositories/s3-repository'
import { FileRepository } from '../repositories/file-repository'
import { getContext } from 'hono/context-storage'
import { env } from 'hono/adapter'

export class WikiModel {
  private repository: Repository

  constructor() {
    const context = getContext();
    const envVariables = env<{
      MODE: string
    }>(context);
    
    const mode = envVariables.MODE || 'development';
    this.repository = mode === 'production' 
      ? new S3Repository() 
      : new FileRepository()
  
  }

  async load(uuid: UUID, user: string): Promise<WikiData | null> {
    return await this.repository.load(uuid, user)
  }
}
