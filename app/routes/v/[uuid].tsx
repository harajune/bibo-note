import { createRoute } from "honox/factory";
import { Viewer } from "../../wiki/screens/viewer";

export default createRoute((c) => {
  const uuid = c.req.param("uuid");
  return c.render(
    <Viewer uuid={uuid} />,
    { title: uuid }
  );
});
