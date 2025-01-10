import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";
import { createImmutable } from "../../libs/immutable/immutable";
import { WikiData } from "../../wiki/models/wiki_data";

/** @jsxImportSource hono/jsx */
export default createRoute((c) => {
  const uuid = c.req.param("uuid");
  const path = c.req.path;
  console.log("Route accessed:", path);
  console.log("UUID parameter:", uuid);
  console.log("Request URL:", c.req.url);
  const wikiModel = new WikiModel();

  try {
    // Handle new article creation
    if (!uuid || uuid === "new") {
      console.log("Creating new article form");
      const newData = new WikiData("", "", "", new Date(), new Date());
      return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
    }

    // Handle existing article
    if (wikiModel.isExists(uuid)) {
      console.log("Loading existing article:", uuid);
      const wikiData = wikiModel.load(uuid);
      return c.render(<Editor wikiData={wikiData} />, { title: wikiData.title || "Untitled" });
    }

    // If article doesn't exist, show new article form
    console.log("Article not found, showing new article form");
    const newData = new WikiData("", "", "", new Date(), new Date());
    return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
  } catch (e) {
    console.error("Error loading article:", e);
    return c.notFound();
  }
});

export const POST = createRoute(async (c) => {
  let uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const form = await c.req.formData();
  const title = (form.get("title") as string) || "Untitled";
  const content = (form.get("content") as string) || "";
  const now = new Date();

  try {
    // Handle new article creation
    if (!uuid || uuid === "" || uuid === "new") {
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

