import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'
import wasm from 'vite-plugin-wasm'
import {dataToEsm} from '@rollup/pluginutils'
import { readFileSync } from 'node:fs'

export default defineConfig({
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
      minify: false,
    }),
    {
      name: 'vite-plugin-base64',
      async transform(source, id) {
          if (!id.match(/.*\.wasm(?:\?.*)?$/)) return
          console.log(id)
          const filename = id.replace(/\?.*$/, '')
          console.log(filename)
          const file = readFileSync(filename)
          const base64 = file.toString('base64')
          return createCode(base64)
      },
    },
  ],
})

function createCode(base64: string) {
  return `
  const base64String = "${base64}";
  const binaryString = atob(base64String)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  export default bytes;
`
}