/**
 * 范例：渲染线的 Vite 配置——接入 Vue 唯一要动的构建配置。
 *
 * 演示内容：7.1 模板里本文件是空的 defineConfig({})，接入 Vue 只需
 * 挂上 @vitejs/plugin-vue（构建期把 .vue 编译成渲染函数，并提供 SFC HMR）。
 * 前置状态：npm install -D @vitejs/plugin-vue。
 * 主要观察：npm start 后改 .vue 文件保存，窗口即时更新且组件状态保留。
 * 边界：只动渲染线；vite.main.config.mts / vite.preload.config.mts 保持为空，
 * 它们不处理 .vue，不需要也不应该挂 vue()。
 * 接 DevTools 时：plugins: [vue(), vueDevTools()]（见 README「Vue DevTools」）。
 */
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
});
