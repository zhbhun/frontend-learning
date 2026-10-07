/**
 * 范例：React 入口（替代 7.1 骨架里的 src/renderer.ts，位于 src/renderer/ 下）。
 *
 * 演示内容：index.html 的 <script type="module"> 指向本文件，
 * createRoot 把 <App /> 挂到 #root 挂载点上。
 * 前置状态：index.html 中需有 <div id="root"></div>。
 * 主要观察：只有入口文件这一层是整页级的；组件改动走 Fast Refresh，
 * 不经过本文件（见 README「路由与热更新」）。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

// 非空断言：模板 HTML 保证 #root 存在
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
