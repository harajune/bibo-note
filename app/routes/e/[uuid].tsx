import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";

export default createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const wikiData = await wikiModel.load(uuid);
  return c.render(<Editor wikiData={wikiData} />,
     { title: wikiData.title });
});

export const POST = createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();

  try {
    const wikiData = createImmutable(await wikiModel.load(uuid));
    const data = await c.req.formData();  
    const updatedWikiData = wikiData.copyWith({
      title: data.get("title") as string,
      content: data.get("content") as string
    });
    await wikiModel.save(updatedWikiData);
    return c.redirect(`/v/${uuid}`);
  } catch (e) {
    console.error('Error saving wiki data:', e);
    return c.json({ error: e.message }, 500);
  }

});

