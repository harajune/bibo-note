import { createRoute } from "honox/factory";
import { Viewer } from "../wiki/screens/viewer";
import { WikiModel } from "../wiki/models/wiki_model";

export default createRoute(async (c) => {
  const wikiModel = new WikiModel();
  
  const latestArticles = await wikiModel.getLatestArticles(20);
  
  if (!latestArticles || latestArticles.length === 0) {
    return c.notFound();
  }
  
  const newestArticle = await wikiModel.load(latestArticles[0].uuid);
  
  if (!newestArticle) {
    return c.notFound();
  }

  const ogp = `https://${c.req.header('x-forwarded-host')}/ogp/${newestArticle.uuid}`;
  const url = `https://${c.req.header('x-forwarded-host')}/v/${newestArticle.uuid}`;
  
  return c.render(
    <Viewer wikiData={newestArticle} articles={latestArticles} />,
    { title: newestArticle.title, ogp: ogp, url: url }
  );
});
