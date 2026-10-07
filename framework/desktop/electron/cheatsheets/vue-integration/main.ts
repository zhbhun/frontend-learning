/**
 * 范例：Vue 入口（替代 7.1 骨架里的 src/renderer.ts，位于 src/renderer/ 下）。
 *
 * 演示内容：index.html 的 <script type="module"> 指向本文件，
 * createApp 把根组件挂到 #app 挂载点上。
 * 前置状态：index.html 中需有 <div id="app"></div>；
 * 注意 src/main.ts 是主进程入口，与本文件同名但各管各的构建线。
 * 主要观察：只有入口文件这一层是整页级的；SFC 改动走 HMR，
 * 不经过本文件（见 README「路由与热更新」）。
 * 接路由时：createRouter 建实例后，改为 createApp(App).use(router).mount('#app')。
 */
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
