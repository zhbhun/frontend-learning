/**
 * 范例：contextBridge 暴露面的类型真源。
 *
 * 演示内容：`window.api` 的类型定义只写这一处，
 * preload 用 satisfies 对账（见 preload.ts），
 * 渲染端经 declare global 消费（见 api.d.ts）。
 * 主要观察：暴露面增删方法或改返回值时，类型改动收敛在本文件；
 * preload 实现与真源不一致时 `npm run typecheck` 直接报错。
 */
export interface AppInfo {
  electron: string;
  node: string;
  platform: string;
}

export interface Api {
  readAppInfo(): Promise<AppInfo>;
  ping(message: string): Promise<string>;
}
