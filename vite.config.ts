import build from '@hono/vite-build/aws-lambda'
import adapter from '@hono/vite-dev-server/cloudflare'
import honox from 'honox/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import commonjs from '@rollup/plugin-commonjs'
import viteCommonjs from 'vite-plugin-commonjs'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'

export default defineConfig(({ mode }) => {
  return {
    build: {
      copyPublicDir: false
    },
    optimizeDeps: {
      include: [
        'fast-xml-parser',
        '@aws-sdk/client-s3',
        'stream-browserify',
        'path-browserify'
      ],
      esbuildOptions: {
        plugins: [
          polyfillNode({
            polyfills: {
              path: true,
              stream: true,
              buffer: true
            }
          })
        ]
      }
    },
    define: {
      'process.env': {},
      'global': 'globalThis',
      'module': '{}'
    },
    plugins: [
      viteCommonjs(),
      {
        name: 'provide-commonjs-helpers',
        resolveId(id) {
          if (id === '\0commonjsHelpers.js') {
            return id;
          }
          return null;
        },
        load(id) {
          if (id === '\0commonjsHelpers.js') {
            return `
              export const commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
              export function getDefaultExportFromCjs(x) { return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x; }
              export function getDefaultExportFromNamespaceIfPresent(n) { return n && Object.prototype.hasOwnProperty.call(n, 'default') ? n['default'] : n; }
              export function getDefaultExportFromNamespaceIfNotNamed(n) { return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n; }
              export function getAugmentedNamespace(n) {
                if (n.__esModule) return n;
                var a = Object.defineProperty({}, '__esModule', { value: true });
                Object.keys(n).forEach(function (k) {
                  var d = Object.getOwnPropertyDescriptor(n, k);
                  Object.defineProperty(a, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return n[k]; }
                  });
                });
                return a;
              }
            `;
          }
          return null;
        }
      },
      commonjs({
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        dynamicRequireTargets: [
          'node_modules/stream-browserify/**/*.js',
          'node_modules/path-browserify/**/*.js',
          'node_modules/fast-xml-parser/**/*.js'
        ]
      }),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      honox({
        client: {
          input: ['/app/global.css'],
        },
        devServer: { 
          adapter
        } 
      }), 
      build({
        outputDir: 'dist/worker',
      })
    ]
  }
})
