import { createRoute } from "honox/factory";
import { Editor } from "../../wiki/screens/editor";
import { WikiModel } from "../../wiki/models/wiki_model";

export default createRoute((c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel();
  const wikiData = wikiModel.load(uuid);
  return c.render(<Editor wikiData={wikiData} />,
     { title: wikiData.title });
});
