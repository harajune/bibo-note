import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";

export default createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel({bucket: c.env.MY_BUCKET});
  const wikiData = await wikiModel.load(uuid);
  return c.render(<Editor wikiData={wikiData} />,
     { title: wikiData.title });
});

export const POST = createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel({bucket: c.env.MY_BUCKET});

  try {
    const wikiData = createImmutable(await wikiModel.load(uuid));
    const data = await c.req.formData();  
    const updatedWikiData = wikiData.copyWith({
      title: data.get("title") as string,
      content: data.get("content") as string,
      updatedAt: new Date()
    });
    await wikiModel.save(updatedWikiData);
    return c.redirect(`/v/${uuid}`);
  } catch (e) {
    console.error('Error saving wiki data:', e);
    return c.json({ error: (e as Error).message }, 500);
  }

});

