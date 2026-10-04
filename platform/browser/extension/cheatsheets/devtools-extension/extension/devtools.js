// devtools 页面：DevTools 窗口打开时创建，窗口关闭时销毁。
// 这里做两件事：在 DevTools 工具栏创建一个自定义面板；与 service worker 建立长连接。
chrome.devtools.panels.create(
  'CDP 面板',
  'icon.png',
  'panel.html',
  (panel) => {
    // onShown 的回调参数就是面板页面的 window：面板页面每次显示都会重建，
    // 需要跨次保留的状态不要只放在面板页面的内存里。
    panel.onShown.addListener((panelWindow) => {
      console.log('面板显示，window 来自参数', panelWindow === window);
    });
    panel.onHidden.addListener(() => {
      console.log('面板隐藏，panel.html 已销毁');
    });
  },
);

// 与 service worker 通信：DevTools 窗口有几个，这个监听器就会收到几次 connect。
// 端口不自动保活 service worker，按官方示例周期性发心跳维持连接。
const connection = chrome.runtime.connect({ name: 'devtools-page' });

setInterval(() => {
  connection.postMessage({ type: 'heartbeat' });
}, 30000);
