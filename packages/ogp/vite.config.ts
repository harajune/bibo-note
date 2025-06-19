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
      
      // WASMファイルをランタイムで読み込むためのコードを生成
      const transformedCode = `
        import { readFileSync } from 'node:fs';
        import { fileURLToPath } from 'node:url';
        import { dirname, join } from 'node:path';
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        
        // WASMファイルを同じディレクトリから読み込む
        const wasmPath = join(__dirname, '${wasmFileName}');
        const wasmBuffer = readFileSync(wasmPath);
        
        export default wasmBuffer;
      `;
      
      return {
        code: transformedCode,
        map: null
      }
    },
    
    // ビルド後にWASMファイルをコピー
    async writeBundle(options, bundle) {
      const outputDir = options.dir || path.dirname(options.file)
      
      // node_modules内のWASMファイルを探す
      const wasmFiles: string[] = []
      const searchDir = path.join(process.cwd(), 'node_modules/@vercel/og')
      
      const findWasmFiles = (dir: string): void => {
        try {
          const files = fs.readdirSync(dir) as string[]
          for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
              findWasmFiles(filePath)
            } else if (file.endsWith('.wasm')) {
              wasmFiles.push(filePath)
            }
          }
        } catch (error) {
          // ディレクトリが読めない場合は無視
        }
      }
      
      findWasmFiles(searchDir)
      
      // WASMファイルを出力ディレクトリにコピー
      for (const wasmFile of wasmFiles) {
        const fileName = path.basename(wasmFile)
        const destPath = path.join(outputDir, fileName)
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        
        // WASMファイルをコピー
        fs.copyFileSync(wasmFile, destPath)
        console.log(`Copied WASM file: ${fileName} to ${outputDir}`)
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