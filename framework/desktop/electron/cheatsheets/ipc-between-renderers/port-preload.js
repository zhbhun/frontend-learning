/**
 * 参考实现：MessagePort 直连的预加载桥——接住主进程移交的端口，包装成页面能力。
 * 输入/前置：主进程在 did-finish-load 后执行 webContents.postMessage('port', null, [port])。
 * 主要操作：从 event.ports[0] 取出端口（到手即原生 DOM MessagePort），把
 *           port.postMessage / onmessage 包装进 contextBridge 暴露面。
 * 预期结果：页面只调用 window.chat.send / onMessage，不接触端口与通道名；
 *           每次握手换新端口，监听自动挂到最新端口上。
 * 阅读主线：MessagePort 过不了 contextBridge（桥上是拷贝，端口是传输对象），
 *           所以包在函数后面——页面拿能力，不拿对象。
 */
const { contextBridge, ipcRenderer } = require('electron');

let port = null;      // 端口本体留在隔离世界
let onMessage = null; // 页面注册的监听器

// 主进程每次握手都移交新端口：直接替换，旧端口（可能已 close）随之废弃
ipcRenderer.on('port', (event) => {
  port = event.ports[0];
  // 渲染端不用手动 start()：给 onmessage 赋值已隐式开启投递
  port.onmessage = (e) => onMessage?.(e.data);
});

contextBridge.exposeInMainWorld('chat', {
  // 专线发送：没有通道名，消息只有对端能收到，主进程看不到
  send: (text) => {
    if (!port) {
      throw new Error('端口尚未移交：等 did-finish-load 之后的首次握手');
    }
    port.postMessage(text);
  },
  // 订阅对端消息：页面初始化先挂监听，再开始使用专线
  onMessage: (listener) => {
    onMessage = listener;
  },
});
