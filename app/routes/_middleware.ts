import { createRoute } from "honox/factory";
import { contextStorage } from "hono/context-storage";

// contextStorage() middleware is necessary for getting the env variables.
export default createRoute(contextStorage());