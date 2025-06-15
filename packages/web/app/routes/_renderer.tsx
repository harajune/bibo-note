import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children, title, ogpImagePath }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {title && <title>{title}</title>}
        {title && <meta property="og:title" content={title} />}
        {ogpImagePath && <meta property="og:image" content={`/ogp/${ogpImagePath}`} />}
        <meta property="og:type" content="article" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Link href="/app/assets/favicon.ico" rel="icon" />
        <Script src="/app/client.ts" async />
      </head>
      <body>{children}</body>
    </html>
  )
})
