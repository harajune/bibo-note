import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";
import { logger } from "../../libs/logger/logger";
export default createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const wikiData = await wikiModel.load(uuid);
  if (!wikiData) {
    return c.notFound();
  }
  
  const articles = await wikiModel.getLatestArticles();
  
  return c.render(<Editor wikiData={wikiData} articles={articles} />,
     { title: wikiData.title });
});

export const POST = createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();

  try {
    const wikiData = await wikiModel.load(uuid);
    if (!wikiData) {
      return c.notFound();
    }
    const immutableWikiData = createImmutable(wikiData);
    const data = await c.req.formData();  
    const updatedWikiData = immutableWikiData.copyWith({
      title: data.get("title") as string,
      content: data.get("content") as string,
      updatedAt: new Date()
    });
    await wikiModel.save(updatedWikiData);
    return c.redirect(`/v/${uuid}`);
  } catch (e) {
    logger.error('Error saving wiki data:', e);
    return c.json({ error: (e as Error).message }, 500);
  }

});

