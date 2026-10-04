// service worker：CDP 会话的载体。
// 面板页面把 inspectedWindow.tabId 发来，这里负责 attach / sendCommand / detach，
// 并把协议事件与 onDetach 打到 service worker 的 DevTools Console。
const PROTOCOL_VERSION = '0.1';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'debugger-attach') {
    attach(message.tabId);
  } else if (message.type === 'debugger-detach') {
    detach(message.tabId);
  }
});

// 心跳端口：让 service worker 在 DevTools 窗口打开期间保持连接。
chrome.runtime.onConnect.addListener((port) => {
  console.log('DevTools 页面已连接，name =', port.name);
  port.onDisconnect.addListener(() => {
    console.log('DevTools 页面断开连接');
  });
});

// onEvent 是协议事件流：source 标识来源会话，method 如 'Network.responseReceived'。
// 监听器必须注册在 service worker 顶层，休眠后就靠它唤醒。
chrome.debugger.onEvent.addListener((source, method, params) => {
  console.log(`[${source.tabId}] ${method}`, params);
});

// onDetach：浏览器终止会话时触发，reason 为 'target_closed' 或 'canceled_by_user'。
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log(`[${source.tabId}] 调试会话结束，reason = ${reason}`);
});

async function attach(tabId) {
  try {
    // requiredVersion：主版本须一致、次版本不低于；官方参考示例取 "0.1"。
    await chrome.debugger.attach({ tabId }, PROTOCOL_VERSION);
    console.log(`已附加 tabId=${tabId}，目标标签页的 DevTools 窗口出现调试横幅`);
    // 打开 Network 域：之后 onEvent 才会收到 Network.* 事件。
    const response = await chrome.debugger.sendCommand(
      { tabId },
      'Network.enable',
      {},
    );
    console.log('Network.enable 响应：', response);
  } catch (error) {
    // 常见失败：目标页面不可调试、同一标签页已有调试器。
    console.error('attach 失败', error);
  }
}

async function detach(tabId) {
  try {
    await chrome.debugger.detach({ tabId });
    console.log(`已分离 tabId=${tabId}`);
  } catch (error) {
    console.error('detach 失败', error);
  }
}
