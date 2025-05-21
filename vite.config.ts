import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from 'vite-plugin-commonjs'

export default defineConfig({
  build: {
    copyPublicDir: false
  },
  optimizeDeps: {
    include: [
      'fast-xml-parser',
      '@aws-sdk/client-s3'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  plugins: [
    {
      name: 'define-module-global',
      transform(code, id) {
        if (id.includes('node_modules/path-browserify') || 
            id.includes('node_modules/stream-browserify') || 
            id.includes('node_modules/fast-xml-parser')) {
          return code.replace(/\bmodule\b/g, 'globalThis.module = globalThis.module || {}');
        }
      }
    },
    commonjs(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
      overrides: {
        stream: 'stream-browserify',
        path: 'path-browserify'
      }
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
  ],
  resolve: {
    alias: {
      'stream': 'stream-browserify',
      'path': 'path-browserify'
    }
  }
})
