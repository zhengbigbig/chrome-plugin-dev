import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build:{
    // 指定输出路径（相对于 项目根目录).
    outDir: 'dist',
    // 指定生成静态资源的存放路径（相对于 build.outDir）。
    assetsDir:'dist/assets',
    /**
     * 小于此阈值的导入或引用资源将内联为 base64 编码，以避免额外的 http 请求。设置为 0 可以完全禁用此项。
     */
    assetsInlineLimit:0,
    /**
     * 启用/禁用 CSS 代码拆分。当启用时，在异步 chunk 中导入的 CSS 将内联到异步 chunk 本身，并在其被加载时插入。
     */
    cssCodeSplit:false,

  }
})
