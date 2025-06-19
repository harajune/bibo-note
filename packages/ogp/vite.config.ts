import { defineConfig } from 'vite'
import build from '@hono/vite-build/aws-lambda'
import devServer from '@hono/vite-dev-server'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// WASMファイルをインライン化するプラグイン
function wasmInlinePlugin() {
  return {
    name: 'wasm-inline',
    enforce: 'pre' as const,
    
    config(config) {
      // Viteのデフォルトの.wasm処理を無効化
      config.assetsInclude = config.assetsInclude || []
      if (Array.isArray(config.assetsInclude)) {
        config.assetsInclude = config.assetsInclude.filter(pattern => !pattern.includes('.wasm'))
      }
    },
    
    async resolveId(source, importer, options) {
      // .wasmファイルのインポートを検出
      if (source.includes('.wasm')) {
        // ?module, ?init, ?url などのクエリを除去
        const cleanPath = source.split('?')[0]
        const resolved = await this.resolve(cleanPath, importer, { ...options, skipSelf: true })
        
        if (resolved && resolved.id.endsWith('.wasm')) {
          // 常に?wasm-inlineクエリを付与
          return resolved.id + '?wasm-inline'
        }
      }
      return null
    },
    
    async load(id) {
      // ?wasm-inlineクエリパラメータを持つファイルを処理
      if (id.includes('?wasm-inline')) {
        const actualId = id.split('?')[0]
        
        try {
          const wasmBuffer = readFileSync(actualId)
          const base64 = wasmBuffer.toString('base64')
          
          // 複数の形式でエクスポート
          return `
            const wasmBase64 = "${base64}";
            const wasmBytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
            
            // デフォルトエクスポート（Viteの?module形式）
            export default function() {
              return WebAssembly.compile(wasmBytes);
            }
            
            // 名前付きエクスポート
            export const initWasm = () => WebAssembly.compile(wasmBytes);
            export const wasmBuffer = wasmBytes;
            
            // fetchのレスポンスをエミュレート
            export const wasmResponse = {
              arrayBuffer: async () => wasmBytes.buffer,
              bytes: async () => wasmBytes,
            };
            
            // グローバル変数として公開（一部のライブラリ用）
            if (typeof globalThis !== 'undefined') {
              globalThis.__wasmBytes = wasmBytes;
            }
          `
        } catch (error) {
          console.error(`Failed to load WASM file: ${actualId}`, error)
          throw error
        }
      }
    },
    
    transform(code, id) {
      // @vercel/ogやyoga関連のファイルを変換
      if (id.includes('@vercel/og') || id.includes('yoga')) {
        let transformedCode = code
        
        // import文とdynamic importの変換
        transformedCode = transformedCode
          // import wasmModule from './yoga.wasm?module' 形式
          .replace(
            /import\s+(\w+)\s+from\s+['"](\.\/)?([^'"]*\.wasm)(\?[^'"]*)?['"]/g,
            `import $1 from '$2$3?wasm-inline'`
          )
          // import('./yoga.wasm?module') 形式
          .replace(
            /import\s*\(\s*['"](\.\/)?([^'"]*\.wasm)(\?[^'"]*)?['"]\s*\)/g,
            `import('$1$2?wasm-inline')`
          )
          // new URL('./yoga.wasm', import.meta.url) 形式
          .replace(
            /new\s+URL\s*\(\s*['"](\.\/)?([^'"]*\.wasm)['"]\s*,\s*import\.meta\.url\s*\)/g,
            `'$1$2?wasm-inline'`
          )
        
        // fetch()によるWASMロードの変換
        if (transformedCode.includes('fetch') && transformedCode.includes('.wasm')) {
          transformedCode = transformedCode
            .replace(
              /fetch\s*\(\s*[^)]*\.wasm[^)]*\)/g,
              'Promise.resolve(wasmResponse)'
            )
        }
        
        return transformedCode !== code ? transformedCode : null
      }
      return null
    }
  }
}

export default defineConfig({
  build: {
    copyPublicDir: false,
    rollupOptions: {
      external: [],
    },
    assetsInlineLimit: 10 * 1024 * 1024, // 10MBまでインライン化
  },
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      // yoga-wasmのパスを解決
      'yoga-wasm-web': resolve(__dirname, 'node_modules/yoga-wasm-web')
    }
  },
  optimizeDeps: {
    exclude: ['@vercel/og'],
    esbuildOptions: {
      loader: {
        '.wasm': 'file'
      }
    }
  },
  plugins: [
    devServer({
      entry: 'src/index.tsx',
    }),
    wasmInlinePlugin(),
    build({
      outputDir: 'dist/worker',
      entry: 'src/index.tsx',
      minify: false,
    })
  ],
})