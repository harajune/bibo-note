import build from '@hono/vite-build/aws-lambda'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
  },
  plugins: [
    honox({
      devServer: {
        exclude: [
          /^\/app\/assets\/.*/,
          /^\/app\/.+\.tsx?/,
          /^\/favicon.ico/,
          /^\/static\/.+/,
          /.*\.css$/,
          /.*\.ts$/,
          /.*\.tsx$/,
          /^\/@.+$/,
          /\?t\=\d+$/,
          /^\/favicon\.ico$/,
          /^\/static\/.+/,
          /^\/node_modules\/.*/,
        ]
       },
      client: { input: ['./app/style.css'] }

    }),
    tailwindcss(),
    build({
      outputDir: 'dist/worker',
    })
  ]
})
