/**
 * 范例：vite-ts 模板下的预加载脚本（类型接线视角）。
 *
 * 演示内容：暴露面用 satisfies 与类型真源（api.ts）在编译期对账。
 * 前置状态：产物固定为 .vite/build/preload.cjs——插件强制 CJS 单文件，
 * 沙箱化预加载脚本不能用 ESM，但源码可以照常写 ESM 的 import。
 * 主要观察：把 readAppInfo 改名或删掉，`npm run typecheck` 立即失败；
 * import type 只参与类型检查，编译期擦除，不会把代码引进沙箱。
 * 阅读主线：electron 包自带类型让 ipcRenderer 无需额外声明。
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from './api';

const api = {
  readAppInfo: () => ipcRenderer.invoke('app:info'),
  ping: (message: string) => ipcRenderer.invoke('app:ping', message),
} satisfies Api;

contextBridge.exposeInMainWorld('api', api);
