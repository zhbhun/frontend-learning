/**
 * 参考实现（预加载脚本）：把 shell 意图包装成具名动词经 IPC 触发主进程。
 * 沙箱渲染进程里 shell 不可用（Electron 默认开启沙箱），渲染端一律走这里。
 * 通道命名与动词设计原则见「预加载脚本」「双向调用」。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('external', {
  // 打开网址：主进程先过协议白名单，非 http(s) 会被拒绝
  open: (url) => ipcRenderer.invoke('shell:open-external', url),
  // 用默认程序打开文件
  openPath: (path) => ipcRenderer.invoke('shell:open-path', path),
  // 在文件管理器中定位并选中（同步动作，主进程无失败反馈）
  showItemInFolder: (fullPath) =>
    ipcRenderer.invoke('shell:show-item-in-folder', fullPath),
  // 移入系统废纸篓，可还原
  trashItem: (path) => ipcRenderer.invoke('shell:trash-item', path),
});
