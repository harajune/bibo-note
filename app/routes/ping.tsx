import { createRoute } from "honox/factory";

export default createRoute((c) => {
  const host = c.req.header('x-forwarded-host') || c.req.header('host');
  return c.text(`${host} pong`);
});