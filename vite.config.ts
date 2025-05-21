import build from '@hono/vite-build/node'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false
    },
    plugins: [
      honox({
        client: {
          input: ['/app/global.css'],
        },
        devServer: { adapter } 
      }), 
      build({
        outputDir: 'dist/worker',
      })
    ]
  }
})
