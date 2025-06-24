import * as fs from 'node:fs'
import * as path from 'node:path'

export class FileRepository {
  private readonly basePath: string

  constructor(basePath: string = './data') {
    this.basePath = basePath
  }

  private getUserBasePath(user: string): string {
    const userPath = path.join(this.basePath, user, 'images')
    
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true })
    }
    return userPath
  }

  private getImagePath(uuid: string, user: string): string {
    const userBasePath = this.getUserBasePath(user)
    return path.join(userBasePath, `${uuid}.png`)
  }

  async uploadImage(uuid: string, imageBuffer: Buffer, user: string): Promise<void> {
    const imagePath = this.getImagePath(uuid, user)
    
    try {
      fs.writeFileSync(imagePath, imageBuffer)
      console.log(`Image saved locally: ${imagePath}`)
    } catch (error) {
      console.error(`Failed to save image locally: ${imagePath}`, error)
      throw new Error('Failed to save image to local file system')
    }
  }

  async getImage(uuid: string, user: string): Promise<Buffer> {
    const imagePath = this.getImagePath(uuid, user)
    
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image not found')
      }
      
      return fs.readFileSync(imagePath)
    } catch (error) {
      console.error(`Failed to read image from local file system: ${imagePath}`, error)
      throw new Error('Image not found')
    }
  }
}