import build from '@hono/vite-build/aws-lambda'
import honox from 'honox/vite'
import { defaultOptions } from '@hono/vite-dev-server'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  build: {
    copyPublicDir: false
  },
  plugins: [
    honox({
      client: {
        input: ['/app/global.css'],
      },
      devServer: {
        exclude: [/^\/app\/assets\/.*/, ...defaultOptions.exclude]
      }
    }), 
    build({
      outputDir: 'dist/worker',
    }),
    tailwindcss()
  ]
} as any)
