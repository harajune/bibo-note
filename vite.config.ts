import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import commonjs from '@rollup/plugin-commonjs'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false
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
      mainFields: ['module', 'jsnext:main', 'jsnext', 'browser', 'main']
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
        },
        devServer: { adapter } 
      }), 
      build({
        outputDir: 'dist/worker',
      })
    ]
  }
})
