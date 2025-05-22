import build from '@hono/vite-build/node'
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
    ],
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    }
  }
})
