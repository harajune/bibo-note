import { createRoute } from "honox/factory";
import { Editor } from "../wiki/screens/editor";
import { WikiModel } from "../wiki/models/wiki_model";
import { createImmutable } from "../libs/immutable/immutable";
import { v7 as uuidv7 } from "uuid";
import { WikiData } from "../wiki/models/wiki_data";
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Context } from 'hono';

type Env = {
  Bindings: {
    MY_BUCKET: R2Bucket;
  };
};

export default createRoute(async (c: Context<Env>) => {
  const wikiModel = new WikiModel({
    MY_BUCKET: c.env.MY_BUCKET
  });
  const blankWikiData = new WikiData(
    "",  // uuid
    "",  // title
    "",  // content
    new Date(), // updatedAt
    new Date()  // createdAt
  );
  
  return c.render(<Editor wikiData={blankWikiData} />,
     { title: "New Article" });
});

export const POST = createRoute(async (c: Context<Env>) => {
  const wikiModel = new WikiModel({
    MY_BUCKET: c.env.MY_BUCKET
  });

  try {
    const data = await c.req.formData();
    const newUuid = uuidv7();
    const newArticle = createImmutable(new WikiData(
      newUuid,
      data.get("title") as string,
      data.get("content") as string,
      new Date(),
      new Date()
    ));
    
    await wikiModel.save(newArticle);
    return c.redirect(`/v/${newUuid}`);
  } catch (e) {
    console.error('Error saving wiki data:', e);
    return c.json({ error: (e as Error).message }, 500);
  }
});
