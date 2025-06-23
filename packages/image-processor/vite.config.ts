import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs'],
      fileName: 'worker',
    },
    outDir: 'dist/worker',
    rollupOptions: {
      external: ['aws-lambda', 'sharp'],
    },
  },
})