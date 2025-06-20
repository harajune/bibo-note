import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'
import { Plugin } from 'vite'
import { promises as fs } from 'fs'
import path from 'path'

// WASMファイルを処理するカスタムプラグイン
const wasmPlugin = (): Plugin => {
  let config: any
  const wasmFiles = new Map<string, string>()
  
  return {
    name: 'wasm-loader',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    
    async load(id) {
      if (id.endsWith('.wasm') || id.endsWith('.wasm?module')) {
        const cleanId = id.replace(/\?.*$/, '')
        const wasmContent = await fs.readFile(cleanId)
        const wasmFileName = path.basename(cleanId)
        
        // WASMファイルを記録
        wasmFiles.set(cleanId, wasmFileName)
        
        // fs.readFileSyncを使用してWASMファイルを読み込むコードを生成
        const code = `
          import { readFileSync } from 'fs';
          import { fileURLToPath } from 'url';
          import { dirname, join } from 'path';
          
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          const wasmPath = join(__dirname, '${wasmFileName}');
          const wasmModule = readFileSync(wasmPath);
          
          export default wasmModule;
        `
        
        return {
          code,
          map: null
        }
      }
    },
    
    async generateBundle() {
      // distディレクトリにWASMファイルをコピー
      for (const [wasmPath, wasmFileName] of wasmFiles.entries()) {
        const wasmContent = await fs.readFile(wasmPath)
        const outputPath = path.join(config.build.outDir, wasmFileName)
        
        // ディレクトリが存在することを確認
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.writeFile(outputPath, wasmContent)
        
        console.log(`WASM file copied: ${wasmFileName} -> ${outputPath}`)
      }
    }
  }
}

// フォントファイルを処理するカスタムプラグイン
const fontPlugin = (): Plugin => {
  let config: any
  const fontFileName = 'BIZUDGothic-Regular.ttf'
  
  return {
    name: 'font-loader',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    
    async transform(code, id) {
      // @vercel/ogのfallbackFont変数を書き換え
      if (id.includes('@vercel/og') && code.includes('fallbackFont')) {        
        // fallbackFont変数をfs.readFileSyncを使用した形に置き換え
        const newCode = code.replace(
          /var fallbackFont =[^;]+;/,
          `
          import { readFileSync } from 'fs';
          import { fileURLToPath } from 'url';
          import { dirname, join } from 'path';

          var fallbackFont = (async () => {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const fontPath = join(__dirname, '${fontFileName}');
            const fontBuffer = readFileSync(fontPath);
            return fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
          })();`
        )
        
        return {
          code: newCode,
          map: null
        }
      }
    },
    
    async generateBundle() {
      // distディレクトリにフォントファイルをコピー
      const fontPath = path.join(process.cwd(), 'assets', fontFileName)
      const fontContent = await fs.readFile(fontPath)
      const outputPath = path.join(config.build.outDir, fontFileName)
      
      // ディレクトリが存在することを確認
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.writeFile(outputPath, fontContent)
      
      console.log(`Font file copied: ${fontFileName} -> ${outputPath}`)
    }
  }
}

export default defineConfig({
  build: {
    copyPublicDir: false,
  },
  assetsInclude: ['**/*.png'],
  plugins: [
    devServer({
      entry: 'src/index.tsx',
    }),
    wasmPlugin(),
    fontPlugin(),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.tsx',
      minify: false,
    })
  ],
})