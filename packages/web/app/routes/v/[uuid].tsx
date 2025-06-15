import { createRoute } from "honox/factory";
import { Viewer } from "../../wiki/screens/viewer";
import { WikiModel } from "../../wiki/models/wiki_model";

export default createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const wikiData = await wikiModel.load(uuid);
  
  if (!wikiData) {
    return c.notFound();
  }
  
  const articles = await wikiModel.getLatestArticles();

  return c.render(
    <Viewer wikiData={wikiData} articles={articles} />,
    { title: wikiData.title }
  );
});
