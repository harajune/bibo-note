import build from '@hono/vite-build/node'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false,
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    optimizeDeps: {
      exclude: ['@aws-sdk/client-s3'],
      esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        platform: 'node'
      }
    },
    resolve: {
      mainFields: ['module', 'jsnext:main', 'jsnext', 'browser', 'main'],
      alias: {
        path: 'path-browserify'
      }
    },
    plugins: [
      commonjs({
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        ignoreDynamicRequires: true
      }),
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
