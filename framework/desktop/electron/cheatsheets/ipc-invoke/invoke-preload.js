/**
 * 双向调用的预加载参考实现（src/preload.js）。
 * 演示：invoke 通道按能力包装成具名函数——包装而非透传（原则见「预加载脚本」课），
 *       以及给不可靠调用加渲染端超时的写法。
 * 用法：整个文件替换 src/preload.js；页面经 window.appInfo / window.settings 调用。
 * 阅读主线：每个具名函数对应一条通道，通道名不出本文件。
 */
const { contextBridge, ipcRenderer } = require('electron');

// 渲染端超时：invoke 没有内建超时，handler 挂起则 Promise 永远 pending，
// 等待要有界时在包装里包一层 Promise.race。
// 注意：超时只是放弃等待，主进程任务仍在运行，真正取消要在主进程实现。
function withTimeout(invokePromise, ms, channel) {
  return Promise.race([
    invokePromise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`请求超时: ${channel} (${ms}ms)`)), ms);
    }),
  ]);
}

contextBridge.exposeInMainWorld('appInfo', {
  // 页面：const version = await window.appInfo.version();
  version: () => ipcRenderer.invoke('app:version'),
});

contextBridge.exposeInMainWorld('settings', {
  // 页面：const theme = await window.settings.get('theme');
  get: (key) => ipcRenderer.invoke('settings:get', key),
  // 页面：const result = await window.settings.set('theme', 'light');
  //       结果对象约定：result.ok 为 false 时看 result.reason
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  // 不可靠路径的示例：超过 5 秒以「请求超时」拒绝
  // get: (key) => withTimeout(ipcRenderer.invoke('settings:get', key), 5000, 'settings:get'),
});
