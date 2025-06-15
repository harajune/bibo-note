import { createRoute } from "honox/factory";
import { WikiModel } from "../../wiki/models/wiki_model";
import * as fs from 'node:fs';

export default createRoute(async (c) => {
  const filename = c.req.param("filename");
  const wikiModel = new WikiModel();
  
  try {
    const uuid = filename?.replace('.png', '');
    if (!uuid) {
      return c.notFound();
    }
    
    const ogpImagePath = wikiModel['repository'].getOGPImagePath(uuid);
    
    if (fs.existsSync(ogpImagePath)) {
      const imageBuffer = fs.readFileSync(ogpImagePath);
      return new Response(imageBuffer, {
        headers: { 'Content-Type': 'image/png' }
      });
    }
    
    return c.notFound();
  } catch (e) {
    return c.notFound();
  }
});
