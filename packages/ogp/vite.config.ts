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
        if (id.match(/.*resvg\.wasm(?:\?.*)?$/)) {
          console.log(id)
          const filename = id.replace(/\?.*$/, '')
          console.log(filename)
          const file = readFileSync(filename)
          const base64 = file.toString('base64')
          return createCodeBase64(base64)

        } else if (id.match(/.*yoga\.wasm(?:\?.*)?$/)) {
          console.log(id)
          const filename = id.replace(/\?.*$/, '')
          console.log(filename)
          const file = readFileSync(filename)
          const base64 = file.toString('base64')
          return createCodeBytes(base64)
        }
        
        return null
      },
    }
  ],
})

function createCodeBase64(base64: string) {
  return `
  const base64String = "data:application/wasm;base64,${base64}";
  export default base64String;
`
}

function createCodeBytes(base64: string) {
  return `
  const base64String = "${base64}";
  const buffer = Buffer.from(base64String, 'base64');
  export default buffer;
`
}