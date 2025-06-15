import { createRoute } from "honox/factory";
import { FileImageRepository, S3ImageRepository } from "../../libs/image/image_repository";
import { getContext } from "hono/context-storage";
import { env } from "hono/adapter";
import * as fs from 'node:fs';

export default createRoute(async (c) => {
  const filename = c.req.param("filename");
  
  try {
    const uuid = filename?.replace('.png', '');
    if (!uuid) {
      return c.notFound();
    }
    
    const context = getContext();
    const envVariables = env<{ MODE: string }>(context);
    const mode = envVariables.MODE || 'development';
    
    let imageRepository;
    if (mode === 'production') {
      imageRepository = new S3ImageRepository('bibo-note-bucket');
    } else {
      imageRepository = new FileImageRepository('./data');
    }
    
    const imagePath = imageRepository.getImagePath(uuid, filename);
    
    if (mode === 'production') {
      return c.notFound();
    } else {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        return new Response(imageBuffer, {
          headers: { 'Content-Type': 'image/png' }
        });
      }
    }
    
    return c.notFound();
  } catch (e) {
    return c.notFound();
  }
});
