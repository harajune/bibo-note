import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";
import { WikiData } from "../../wiki/models/wiki_data";

export default createRoute((c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();

  // Handle /e/ route (empty UUID)
  if (!uuid || uuid === "") {
    const newData = new WikiData("", "", "", new Date(), new Date());
    return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
  }

  // Handle existing article
  try {
    const wikiData = wikiModel.load(uuid);
    return c.render(<Editor wikiData={wikiData} />, { title: wikiData.title });
  } catch (e) {
    return c.notFound();
  }
});

export const POST = createRoute(async (c) => {
  let uuid = c.req.param("uuid") || "";
  const wikiModel = new WikiModel();
  const form = await c.req.formData();
  const title = (form.get("title") as string) || "Untitled";
  const content = (form.get("content") as string) || "";
  const now = new Date();

  try {
    if (uuid === "") {
      // Create new article
      uuid = crypto.randomUUID();
      const newData = new WikiData(uuid, title, content, now, now);
      wikiModel.save(newData);
    } else {
      // Update existing article
      const wikiData = createImmutable(wikiModel.load(uuid));
      const updatedWikiData = wikiData.copyWith({
        title,
        content
      });
      wikiModel.save(updatedWikiData);
    }
    return c.redirect(`/v/${uuid}`);
  } catch (e) {
    return c.notFound();
  }
});

