import { Context, Hono } from 'hono';
import { handle } from 'hono/lambda-edge';
import type { Callback, CloudFrontRequest } from 'hono/lambda-edge'
import { basicAuth } from 'hono/basic-auth';

const basicAuthMiddleware = basicAuth({
  username: 'harajune',
  password: 'bxE-PPf8iV@-MZb8i@B.',
});

type Bindings = {
  callback: Callback
  request: CloudFrontRequest
}
const app = new Hono<{ Bindings: Bindings }>();

function addXForwardedHost(c: Context) {
  c.env.request.headers['x-forwarded-host'] = [{ key: 'x-forwarded-host', value: c.req.header('host') ?? '' }];
}

// Check if this is development environment and should secure entire site
const isSecureEntireEnvironment = process.env.SECURE_ENTIRE_ENVIRONMENT === 'true';

// Apply basic auth to all routes in development environment
if (isSecureEntireEnvironment) {
  app.use('*', basicAuthMiddleware);
}

app.get('v/*', async (c, next) => {
  await next();
  addXForwardedHost(c);
  c.env.callback(null, c.env.request);
});

app.get('ping', async (c, next) => {
  await next();
  addXForwardedHost(c);
  c.env.callback(null, c.env.request);
});

// In production, only secure specific paths
if (!isSecureEntireEnvironment) {
  app.use('e/*', basicAuthMiddleware, async (c, next) => {
    await next();
    addXForwardedHost(c);
    c.env.callback(null, c.env.request);
  });

  app.use('new', basicAuthMiddleware, async (c, next) => {
    await next();
    addXForwardedHost(c);
    c.env.callback(null, c.env.request);
  });
} else {
  // In development, auth is already applied globally, so just handle the routes
  app.get('e/*', async (c, next) => {
    await next();
    addXForwardedHost(c);
    c.env.callback(null, c.env.request);
  });

  app.get('new', async (c, next) => {
    await next();
    addXForwardedHost(c);
    c.env.callback(null, c.env.request);
  });
}

export const handler = handle(app);