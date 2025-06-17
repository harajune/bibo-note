import { WikiData, UUID, Repository } from './repository'
import * as TOML from 'smol-toml'
import * as fs from 'node:fs'
import * as path from 'node:path'

export class FileRepository implements Repository {
  private readonly filePath: string

  constructor(filePath: string = './data') {
    this.filePath = filePath
  }

  private getUserBasePath(user: string): string {
    const mode = process.env.MODE || 'development'
    const basePath = mode === 'development' ? this.filePath : path.join(this.filePath, user)
    
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true })
    }
    return basePath
  }

  public async load(uuid: UUID, user: string): Promise<WikiData | null> {
    const filename = this.getFilePath(uuid, user)
    try {
      const tomlString = fs.readFileSync(filename, 'utf-8')
      if (!tomlString) {
        return null
      }
      const tomlData = TOML.parse(tomlString) as {
        content: { title: string; content: string }
        header: { updatedAt: string; createdAt: string; isDraft?: boolean }
      }
      return new WikiData(
        uuid,
        tomlData.content.title,
        tomlData.content.content,
        new Date(tomlData.header.updatedAt),
        new Date(tomlData.header.createdAt),
        tomlData.header.isDraft || false
      )
    } catch (e) {
      console.error(`Failed to load wiki data for filename: ${filename}`)
      return null
    }
  }

  private getFilePath(uuid: UUID, user: string): string {
    const basePath = this.getUserBasePath(user)
    
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true })
    }
    
    return path.join(basePath, `${uuid}.toml`)
  }
}
