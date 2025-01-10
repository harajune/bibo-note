import { createRoute } from "honox/factory";

export default createRoute((c) => {
  // Redirect to /e/new for new article creation
  return c.redirect("/e/new");
});
