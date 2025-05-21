import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig({
  build: {
    copyPublicDir: false
  },
  optimizeDeps: {
    include: [
      'fast-xml-parser',
      '@aws-sdk/client-s3'
    ]
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
    'module': '{}'
  },
  plugins: [
    commonjs({
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
      dynamicRequireTargets: [
        'node_modules/stream-browserify/**/*.js',
        'node_modules/path-browserify/**/*.js',
        'node_modules/fast-xml-parser/**/*.js'
      ]
    }),
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
  ],
  resolve: {
    alias: {
      'stream': 'stream-browserify',
      'path': 'path-browserify'
    }
  }
})
