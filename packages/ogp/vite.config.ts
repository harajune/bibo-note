import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'
import { createFilter } from '@rollup/pluginutils'
import * as fs from 'node:fs'
import * as path from 'node:path'

// @vercel/ogのWASMファイルを適切に処理するプラグイン
const wasmPlugin = () => {
  const filter = createFilter('**/*.wasm')
  
  return {
    name: 'vite-plugin-wasm-files',
    enforce: 'pre' as const, // 他のプラグインより先に処理
    
    // ビルド時の処理
    async transform(code, id) {
      // URLパラメータを除去してファイルパスを取得
      const cleanId = id.split('?')[0]
      if (!filter(cleanId)) return null
      
      // WASMファイルのパスを取得
      const wasmFileName = path.basename(cleanId)
      
      // WASMファイルをBase64エンコードしてインライン化
      const wasmContent = fs.readFileSync(cleanId)
      const base64Content = wasmContent.toString('base64')
      
      // WASMファイルをランタイムで読み込むためのコードを生成
      const transformedCode = `
        // WASMファイルをBase64からデコード
        const base64 = "${base64Content}";
        
        // Base64をArrayBufferに変換
        function base64ToArrayBuffer(base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
        
        // AWS Lambda環境でのfetch回避のための実装
        if (typeof global !== 'undefined' && !global.fetch_original) {
          global.fetch_original = global.fetch || fetch;
          global.fetch = function(input, init) {
            const url = typeof input === 'string' ? input : input.url;
            
            // WASMファイルへのfetchをインターセプト
            if (url && url.includes('${wasmFileName}')) {
              return Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(base64ToArrayBuffer(base64)),
                headers: new Headers({
                  'content-type': 'application/wasm'
                })
              });
            }
            
            // その他のfetchは通常通り処理
            return global.fetch_original(input, init);
          };
        }
        
        // Node.js環境でのreadFileSync対応
        const wasmBuffer = Buffer.from(base64, 'base64');
        export default wasmBuffer;
      `;
      
      return {
        code: transformedCode,
        map: null
      }
    }
  }
}

export default defineConfig({
  build: {
    copyPublicDir: false,
  },
  plugins: [
    devServer({
      entry: 'src/index.tsx',
    }),
    wasmPlugin(),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.tsx',
      minify: false,
    })
  ],
})