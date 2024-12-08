import { css } from "hono/css";
import { createRoute } from "honox/factory";
import { Viewer } from "../viewer/viewer";

const className = css`
  font-family: sans-serif;
`;

export default createRoute((c) => {
  const name = c.req.query("name") ?? "Hono";
  return c.render(
    <Viewer name={name} />,
    { title: name }
  );
});
