import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from '@rollup/plugin-commonjs'
import { cjsInterop } from 'vite-plugin-cjs-interop'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false
    },
    optimizeDeps: {
      include: [
        'fast-xml-parser',
        '@aws-sdk/client-s3',
        'stream-browserify',
        'path-browserify'
      ],
      force: true,
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    },
    define: {
      'process.env': {},
      'global': 'globalThis',
      'module': '{}'
    },
    server: {
      hmr: {
        overlay: false // Disable error overlay
      }
    },
    plugins: [
      cjsInterop({
        dependencies: [
          'fast-xml-parser',
          'stream-browserify',
          'path-browserify',
          '@aws-sdk/**'
        ]
      }),
      commonjs(),
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
