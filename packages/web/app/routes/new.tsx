import { createRoute } from "honox/factory";
import { Editor } from "../wiki/screens/editor";
import { WikiModel } from "../wiki/models/wiki_model";
import { createImmutable } from "../libs/immutable/immutable";
import { v7 as uuidv7 } from "uuid";
import { WikiData } from "../wiki/models/wiki_data";
import { logger } from "../libs/logger/logger";
export default createRoute(async (c) => {
  const wikiModel = new WikiModel();
  const blankWikiData = new WikiData(
    "",  // uuid
    "",  // title
    "",  // content
    new Date(), // updatedAt
    new Date()  // createdAt
  );
  
  const articles = await wikiModel.getLatestArticles(20, true);
  
  return c.render(<Editor wikiData={blankWikiData} articles={articles} />,
     { title: "New Article" });
});

export const POST = createRoute(async (c) => {
  const wikiModel = new WikiModel();

  try {
    const data = await c.req.formData();
    const newUuid = uuidv7();
    const newArticle = createImmutable(new WikiData(
      newUuid,
      data.get("title") as string,
      data.get("content") as string,
      new Date(),
      new Date(),
      data.get("isDraft") === "on"
    ));
    
    await wikiModel.save(newArticle);
    return c.redirect(`/v/${newUuid}`);
  } catch (e) {
    logger.error(e);
    return c.notFound();
  }
});
