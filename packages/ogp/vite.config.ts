import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'
import wasm from 'vite-plugin-wasm'
import { dataToEsm } from '@rollup/pluginutils'
import { readFileSync } from 'fs';


export default defineConfig({
  optimizeDeps: {
    exclude: ['@vercel/og'],
  },
  build: {
    copyPublicDir: false,
/*    lib: {
      entry: 'src/index.tsx',
      formats: ['cjs'],
      fileName: 'index',
    }, */
  },
  plugins: [
    devServer({
      entry: 'src/index.tsx',
    }),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.tsx',
    }),
    {
      name: 'vite-plugin-base64',
      async transform(source, id) {
          if (!id.match(/.*\.wasm(?:\?.*)?$/)) return
          const base64 = Buffer.from(source).toString('base64');
          return {
              code: `export default "data:application/wasm;base64,${base64}"`,
              map: null
          }
      },
    },
    wasm()
  ],
})
