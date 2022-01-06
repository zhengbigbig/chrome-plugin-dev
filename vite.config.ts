import react from '@vitejs/plugin-react'
import copy from 'rollup-plugin-copy'
import { defineConfig } from 'vite'
const path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    copy({
      targets: [
        { src: path.resolve(__dirname, 'manifest.json'), dest: 'dist' },
        { src: path.resolve(__dirname, 'src/assets'), dest: 'dist' },
      ],
      hook: 'writeBundle',
    }),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    target: 'es6',
    chunkSizeWarningLimit: 100000000,
    brotliSize: false,
    rollupOptions: {
      inlineDynamicImports: true,
      input: {
        background: './src/background/index.ts',
        content_script: './src/content-script/index.ts',
        inject: './src/inject/index.ts',
        popup: './index.html',
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        plugins: [
          copy({
            targets: [
              {
                src: path.resolve(__dirname, 'dist/index.html'),
                dest: 'dist',
                rename: (name, ext, fullPath) => `popup.${ext}`,
              },
            ],
            hook: 'writeBundle',
          }),
        ],
      },
    },
    // 指定输出路径（相对于 项目根目录).
    outDir: 'dist',
    // 指定生成静态资源的存放路径（相对于 build.outDir）。
    assetsDir: 'static',
    /**
     * 小于此阈值的导入或引用资源将内联为 base64 编码，以避免额外的 http 请求。设置为 0 可以完全禁用此项。
     */
    assetsInlineLimit: 100000000,
    /**
     * 启用/禁用 CSS 代码拆分。当启用时，在异步 chunk 中导入的 CSS 将内联到异步 chunk 本身，并在其被加载时插入。
     */
    cssCodeSplit: false,
  },
  server: {
    cors: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
