/**
 * 范例：渲染线的 Vite 配置——接入 React 唯一要动的构建配置。
 *
 * 演示内容：7.1 模板里本文件是空的 defineConfig({})，接入 React 只需
 * 挂上 @vitejs/plugin-react（提供 Fast Refresh 与 automatic JSX runtime）。
 * 前置状态：npm install -D @vitejs/plugin-react。
 * 主要观察：npm start 后改组件文件保存，窗口即时更新且组件 state 保留。
 * 边界：只动渲染线；vite.main.config.mts / vite.preload.config.mts 保持为空，
 * 它们不处理 tsx，不需要也不应该挂 react()。
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
});
