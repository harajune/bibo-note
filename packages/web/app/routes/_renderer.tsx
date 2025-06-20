import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children, title, ogp, url }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Link href="/app/assets/favicon.ico" rel="icon" />
        <meta property="og:title" content={title ? `${title} - Bibo Note` : 'Bibo Note'} />
        <meta property="og:type" content="website" />
        {ogp && <meta property="og:image" content={ogp} />}
        {url && <meta property="og:url" content={url} />}
        <title>{title ? `${title} - Bibo Note` : 'Bibo Note'}</title>
        <Script src="/app/client.ts" async />
      </head>
      <body>{children}</body>
    </html>
  )
})
