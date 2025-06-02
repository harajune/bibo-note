import build from '@hono/vite-build/aws-lambda'
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
        }
      }), 
      build({
        outputDir: 'dist/worker',
      })
    ]
  }
})
