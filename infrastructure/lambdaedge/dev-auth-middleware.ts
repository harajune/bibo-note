import { Context } from 'hono';

const BASIC_AUTH_USERNAME = 'harajune';
const BASIC_AUTH_PASSWORD = 'bxE-PPf8iV@-MZb8i@B.';

export function createDevAuthMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const path = c.req.path;
    
    if (path.startsWith('/e/') || path === '/new') {
      const authHeader = c.req.header('authorization');
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        c.header('WWW-Authenticate', 'Basic realm="Development Environment"');
        return c.text('Unauthorized', 401);
      }
      
      const base64Credentials = authHeader.slice(6);
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(':');
      
      if (username !== BASIC_AUTH_USERNAME || password !== BASIC_AUTH_PASSWORD) {
        c.header('WWW-Authenticate', 'Basic realm="Development Environment"');
        return c.text('Unauthorized', 401);
      }
    }
    
    await next();
  };
}
