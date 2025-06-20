import { createRoute } from "honox/factory";
import { contextStorage } from "hono/context-storage";
import { logger } from "hono/logger";
import { MiddlewareHandler } from "hono";
import { env } from "hono/adapter";

// マルチテナント用のミドルウェア
const multitenant = (): MiddlewareHandler => {
  return async (c, next) => {
    // コンテキストから環境変数を取得
    const envVariables = env<{
      MULTITENANT: string
    }>(c);
    
    // 環境変数MULTITENANTが1の場合のみサブドメイン処理を行う
    if (envVariables.MULTITENANT === '1') {
      // x-forwarded-hostヘッダを優先し、なければhostヘッダを使用
      const forwardedHost = c.req.header('x-forwarded-host');
      const host = forwardedHost || c.req.header('host');
      
      if (host) {
        // subdomain.bibo-note.jpの形式からsubdomainを取得
        const hostParts = host.split('.');
        const user = hostParts[0];
        if (user != 'harajune') {
          return c.redirect('https://harajune.bibo-note.jp');
        }
        c.set('user', user);
      } else {
        //FIXME: 将来的にマルチテナントが正式になった場合、ここをwwwに書き換える
        // hostがセットされていない場合、harajune.bibo-note.jpにリダイレクト
        return c.redirect('https://harajune.bibo-note.jp');
      }
    } else {
      c.set('user', null);
    }

    await next();
  };
};

// contextStorage() middleware is necessary for getting the env variables.
export default createRoute(logger(), multitenant(), contextStorage());