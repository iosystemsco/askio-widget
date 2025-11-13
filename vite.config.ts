/**
 * Vite configuration for chat widget library build
 * 
 * Optimization features:
 * - Code splitting: Voice features and i18n translations are split into separate chunks
 * - Terser minification: Aggressive compression with console.log removal
 * - Tree shaking: ESM format enables optimal dead code elimination
 * - CSS optimization: Handled by PostCSS with cssnano
 * - Target: ES2020 for modern browsers with smaller bundle size
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        headless: resolve(__dirname, 'src/headless.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        return format === 'es' ? `${entryName}.js` : `${entryName}.${format}`;
      },
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'styles.css';
          }
          return assetInfo.name || 'asset';
        },
        // Enable code splitting for better tree-shaking
        manualChunks: (id) => {
          // Split voice features into separate chunk
          if (id.includes('useVoice') || id.includes('recording') || id.includes('audio')) {
            return 'voice';
          }
          // Split i18n translations into separate chunks
          if (id.includes('/locales/')) {
            const match = id.match(/locales\/(\w+)\.json/);
            if (match) {
              return `i18n-${match[1]}`;
            }
          }
          // Keep core functionality in main chunk
          return undefined;
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'],
        passes: 2,
        unsafe: false,
        unsafe_comps: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        conditionals: true,
        dead_code: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        keep_fargs: false,
        keep_fnames: false,
        toplevel: false,
      },
      mangle: {
        safari10: true,
        toplevel: false,
      },
      format: {
        comments: false,
        preamble: '/* AskIO Chat Widget */',
      },
    },
    sourcemap: true,
    // Target modern browsers for better compression
    target: 'es2020',
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
});
