import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      formats: ['iife'],
      fileName: () => 'embed.js',
      name: 'AskIOChat',
    },
    rollupOptions: {
      // Don't externalize React for IIFE bundle - include it in the bundle
      external: [],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'embed.css';
          }
          return assetInfo.name || 'asset';
        },
        // Ensure globals are not used since we're bundling everything
        globals: {},
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
        // Preserve the global AskIOChat name
        reserved: ['AskIOChat'],
        safari10: true,
        toplevel: false,
      },
      format: {
        comments: false,
        preamble: '/* AskIO Chat Widget - Embedded Version */',
      },
    },
    sourcemap: true,
    // Target modern browsers for better compression
    target: 'es2020',
    // Optimize chunk size for embed
    chunkSizeWarningLimit: 1000,
  },
});
