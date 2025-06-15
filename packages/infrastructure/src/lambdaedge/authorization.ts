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

// Common middleware to handle X-Forwarded-Host and callback
const handleRequest = async (c: Context, next: () => Promise<void>) => {
  await next();
  c.env.request.headers['x-forwarded-host'] = [{ key: 'x-forwarded-host', value: c.req.header('host') ?? '' }];
  c.env.callback(null, c.env.request);
};

// Get environment from function name
const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || '';
const isDevelopment = functionName.includes('-development');
const isSecureEntireEnvironment = isDevelopment;

// Handle all requests
app.use('*', handleRequest);

// Apply basic auth to all routes in development environment
if (isSecureEntireEnvironment) {
  app.use('*', basicAuthMiddleware);
} else { // In production, only secure specific paths
  app.use('e/*', basicAuthMiddleware);
  app.use('new', basicAuthMiddleware);
}

export const handler = handle(app);