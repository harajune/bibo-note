import { WikiData, UUID } from './s3-repository'

export interface Repository {
  load(uuid: UUID, user: string): Promise<WikiData | null>
}
