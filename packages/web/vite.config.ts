import build from '@hono/vite-build/aws-lambda'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  build: {
    copyPublicDir: false,
  },
  ssr: {
    // fast-xml-parser can't be bundled in dev mode beucause it's common js module
    external: mode === 'production' ? [] : ['fast-xml-parser'],
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
}))
