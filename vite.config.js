import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  }
});
