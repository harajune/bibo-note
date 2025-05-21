import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  build: {
    copyPublicDir: false
  },
  optimizeDeps: {
    include: [
      'fast-xml-parser',
      '@aws-sdk/client-s3'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        module: '{}'
      }
    }
  },
  define: {
    'module': '{}',
    'global': 'globalThis'
  },
  plugins: [
    {
      name: 'patch-commonjs-modules',
      configResolved() {
        const pathBrowserifyPath = path.resolve(__dirname, 'node_modules/path-browserify/index.js');
        if (fs.existsSync(pathBrowserifyPath)) {
          let content = fs.readFileSync(pathBrowserifyPath, 'utf8');
          content = content.replace(/module\.exports\s*=\s*/, 'var pathBrowserifyExports = ');
          content += '\nexport default pathBrowserifyExports;';
          fs.writeFileSync(pathBrowserifyPath, content);
        }
        
        const fxpPath = path.resolve(__dirname, 'node_modules/fast-xml-parser/src/fxp.js');
        if (fs.existsSync(fxpPath)) {
          let content = fs.readFileSync(fxpPath, 'utf8');
          content = content.replace(/require\(/g, 'import(');
          content = content.replace(/module\.exports\s*=\s*/, 'var fxpExports = ');
          content += '\nexport default fxpExports;';
          fs.writeFileSync(fxpPath, content);
        }
      }
    },
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
      overrides: {
        stream: 'stream-browserify',
        path: 'path-browserify'
      }
    }),
    honox({
      client: {
        input: ['/app/global.css', '/public/polyfills.js'],
      },
      devServer: { 
        adapter
      } 
    }), 
    build({
      outputDir: 'dist/worker',
    })
  ],
  resolve: {
    alias: {
      'stream': 'stream-browserify',
      'path': 'path-browserify'
    }
  }
})
