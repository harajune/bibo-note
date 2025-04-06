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

export const handler = handle(app);