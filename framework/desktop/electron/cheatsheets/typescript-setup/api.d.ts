/**
 * 范例：渲染端的全局类型声明（无运行时代码）。
 *
 * 演示内容：让渲染进程代码里 `window.api` 拿到 Api 类型。
 * 前置状态：本文件必须位于 tsconfig 的 include 范围内
 * （模板 include 了 src 目录全部文件与根目录 .ts、.mts）。
 * 主要观察：声明生效后 `window.api.readAppInfo()` 返回完整的 AppInfo；
 * 漏掉本文件或 include 时，渲染端访问 window.api 报 TS2339。
 */
import type { Api } from './api';

declare global {
  interface Window {
    api: Api;
  }
}

// 文件里有 import/export 即成为模块，declare global 才合法
export {};
