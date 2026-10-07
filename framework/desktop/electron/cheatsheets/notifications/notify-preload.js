/**
 * 参考实现（预加载）：把「发通知」「请求关注」包装成页面主世界的具名动词。
 * 输入：渲染端调用 window.notify.send('...') / window.notify.bounce()；
 * 操作：包装为 invoke 通道调用，通道名与 ipcRenderer 不出 preload；
 * 预期：页面拿到简单的能力对象，主进程细节（isSupported、角标、平台分支）不可见。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notify', {
  // 渲染端只表达意图：标题、签名、未读数、角标都在主进程收口
  send: (body) => ipcRenderer.invoke('notify:send', { title: '新消息', body }),
  // 请求关注：macOS Dock 弹跳，其他平台返回 null
  bounce: () => ipcRenderer.invoke('notify:bounce'),
});
