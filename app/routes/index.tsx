import { createRoute } from "honox/factory";
import { Viewer } from "../wiki/screens/viewer";
import { WikiModel } from "../wiki/models/wiki_model";

export default createRoute(async (c) => {
  const wikiModel = new WikiModel();
  
  const latestArticles = await wikiModel.getLatestArticles(20);
  
  if (!latestArticles || latestArticles.length === 0) {
    return c.redirect("/new");
  }
  
  const newestArticle = await wikiModel.load(latestArticles[0].uuid);
  
  if (!newestArticle) {
    return c.redirect("/new");
  }
  
  return c.render(
    <Viewer wikiData={newestArticle} articles={latestArticles} />,
    { title: newestArticle.title }
  );
});
