import { createRoute } from "honox/factory";
import { Editor } from "../wiki/screens/editor";
import { WikiModel } from "../wiki/models/wiki_model";
import { createImmutable } from "../libs/immutable/immutable";
import { v7 as uuidv7 } from "uuid";
import { WikiData } from "../wiki/models/wiki_data";

export default createRoute((c) => {
  const blankWikiData = new WikiData(
    "",  // uuid
    "",  // title
    "",  // content
    new Date(), // updatedAt
    new Date()  // createdAt
  );
  
  return c.render(<Editor wikiData={blankWikiData} />,
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
      new Date()
    ));
    
    wikiModel.save(newArticle);
    return c.redirect(`/v/${newUuid}`);
  } catch (e) {
    return c.notFound();
  }
});
