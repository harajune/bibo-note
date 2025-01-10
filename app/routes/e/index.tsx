import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiData } from "../../wiki/models/wiki_data";
import { WikiModel } from "../../wiki/models/wiki_model";

export default createRoute((c) => {
  // Handle both /e and /e/ paths
  const newData = new WikiData("", "", "", new Date(), new Date());
  return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
});

export const POST = createRoute(async (c) => {
  const uuid = crypto.randomUUID();
  const now = new Date();
  const form = await c.req.formData();
  const title = (form.get("title") as string) || "Untitled";
  const content = (form.get("content") as string) || "";

  // Create new WikiData
  const newData = new WikiData(uuid, title, content, now, now);
  const wikiModel = new WikiModel();
  wikiModel.save(newData);

  return c.redirect(`/v/${uuid}`);
});
