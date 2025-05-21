import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false
    },
    optimizeDeps: {
      exclude: [
        'fast-xml-parser',
        '@aws-sdk/client-s3',
        'stream-browserify',
        'path-browserify'
      ]
    },
    define: {
      'process.env': {},
      'global': 'globalThis',
      'module': '{}'
    },
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      honox({
        client: {
          input: ['/app/global.css'],
        },
        devServer: { 
          adapter
        } 
      }), 
      build({
        outputDir: 'dist/worker',
      })
    ]
  }
})
