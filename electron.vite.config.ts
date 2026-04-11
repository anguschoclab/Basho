import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
// VitePWA intentionally excluded — service workers are not used in Electron

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts'),
        },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        // d3-interpolate 3.x has no CJS entry; alias to victory-vendor's bundled copy
        // which ships both CJS (lib/) and ESM (es/) versions of d3 packages.
        'd3-interpolate': resolve(__dirname, 'node_modules/victory-vendor/lib/d3-interpolate.js'),
        'd3-color': resolve(__dirname, 'node_modules/victory-vendor/lib/d3-color.js'),
        'd3-ease': resolve(__dirname, 'node_modules/victory-vendor/lib/d3-ease.js'),
      },
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
  },
})
