import { jsxRenderer } from 'hono/jsx-renderer'
import { Script, Link } from 'honox/server'

export default jsxRenderer(({ children, title }) => {
  return (
    <html lang="ja" class="h-full bg-gray-50">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="icon" href="/favicon.ico" />
        <Script src="/app/client.ts" async />
        <Link href="/app/style.css" rel="stylesheet" />
      </head>
      <body class="h-full">{children}</body>
    </html>
  )
})
