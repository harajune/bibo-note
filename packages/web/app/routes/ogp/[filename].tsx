import { createRoute } from "honox/factory";

export default createRoute(async (c) => {
  const title = c.req.query('title');
  
  if (!title) {
    return c.notFound();
  }
  
  const ogpUrl = `/ogp?title=${encodeURIComponent(title)}`;
  return c.redirect(ogpUrl);
});
