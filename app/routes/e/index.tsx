import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiData } from "../../wiki/models/wiki_data";

export default createRoute((c) => {
  // Handle /e/ route with empty form
  const newData = new WikiData("", "", "", new Date(), new Date());
  return c.render(<Editor wikiData={newData} />, { title: "Create New Article" });
});
