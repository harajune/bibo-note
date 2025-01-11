import { createRoute } from "honox/factory";
import { Viewer } from "../../wiki/screens/viewer";
import { WikiModel } from "../../wiki/models/wiki_model";

export default createRoute(async (c) => {
  const uuid = c.req.param("uuid");
  const wikiModel = new WikiModel({bucket: c.env.MY_BUCKET});
  const wikiData = await wikiModel.load(uuid);
  
  return c.render(
    <Viewer wikiData={wikiData} />,
    { title: wikiData.title }
  );
});
