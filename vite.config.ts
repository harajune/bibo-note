import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
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
      commonjs(),
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
