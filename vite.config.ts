import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
        global: 'globalThis'
      }
    }
  },
  plugins: [
    {
      name: 'inject-module-global',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `
              window.module = window.module || {};
              window.require = window.require || function(mod) {
                console.log('Polyfilled require called for:', mod);
                if (mod === 'stream-browserify') return window.streamBrowserify;
                if (mod === 'path-browserify') return window.pathBrowserify;
                if (mod === 'fast-xml-parser') return window.fastXmlParser;
                throw new Error('Module not found: ' + mod);
              };
            `,
            injectTo: 'head-prepend'
          }
        ];
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
