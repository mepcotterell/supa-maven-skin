import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const rootDir = resolve(import.meta.dirname, '../../..');
const outDir = resolve(rootDir, 'target/classes');

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true
      }
    }
  },
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: false,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        'mvn-furo-skin': resolve(import.meta.dirname, 'ts/index.ts')
      },
      output: {
        format: 'es',
        entryFileNames: 'js/mvn-furo-skin.min.js',
        chunkFileNames: 'js/[name].min.js',
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : []);
          if (names.some((n) => n.endsWith('.css'))) {
            return 'css/mvn-furo-skin.min.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  test: {
    root: rootDir,
    environment: 'happy-dom',
    include: ['src/test/frontend/**/*.test.ts']
  }
});
