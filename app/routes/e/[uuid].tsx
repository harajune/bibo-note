import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";

export default createRoute((c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const wikiData = wikiModel.load(uuid);
  return c.render(<Editor wikiData={wikiData} />,
     { title: wikiData.title });
});

export const POST = createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();

  try {
    const wikiData = createImmutable(wikiModel.load(uuid));
    const data = await c.req.formData();  
    const updatedWikiData = wikiData.copyWith({
      title: data.get("title") as string,
      content: data.get("content") as string
    });
    wikiModel.save(updatedWikiData);
    return c.redirect(`/v/${uuid}`);
  } catch (e) {
    return c.notFound();
  }

});

