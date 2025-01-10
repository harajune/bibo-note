/** @jsxImportSource hono/jsx */
import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiData } from "../../wiki/models/wiki_data";
import { WikiModel } from "../../wiki/models/wiki_model";

// Default export for GET handler
export default createRoute((c) => {
  console.log("Accessing /e/ index route");
  // Create empty WikiData for new article
  const newData = new WikiData("", "", "", new Date(), new Date());
  return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
});

// POST handler for form submission
export const POST = createRoute(async (c) => {
  console.log("Processing POST request in /e/ index route");
  const uuid = crypto.randomUUID();
  const now = new Date();
  const form = await c.req.formData();
  const title = (form.get("title") as string) || "Untitled";
  const content = (form.get("content") as string) || "";

  // Create and save new article
  const newData = new WikiData(uuid, title, content, now, now);
  const wikiModel = new WikiModel();
  wikiModel.save(newData);

  // Redirect to view page
  return c.redirect(`/v/${uuid}`);
});
