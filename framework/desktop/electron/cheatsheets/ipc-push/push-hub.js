/**
 * 范例介绍：主进程侧的推送参考实现，把「找窗口 → 确认存活 → 发送」收敛到一个入口。
 * 演示内容：定向推送（pushTo）、全员广播（broadcast）、did-finish-load 就绪门控
 *          （pushStateWhenReady）三种发送方式。
 * 前置状态：窗口按「多窗口」课的注册表惯例管理（创建即登记、closed 即注销），
 *          getWindow 来自那一课的 window-registry.js，本文件不重复实现。
 * 主要操作：事件源（定时器、tray、菜单回调）只调用这里的入口，不各自持有窗口引用。
 * 预期结果：存活窗口收到消息；已销毁窗口被跳过，不抛 Object has been destroyed。
 * 阅读主线：send 的接收方是 webContents——发送前先回答「发给谁、它还活着吗、它准备好了吗」。
 */
const { BrowserWindow } = require('electron');

// const { getWindow } = require('./window-registry'); // 「多窗口」课的注册表，带 isDestroyed 兜底

/** 定向推送：按业务 key 找窗口，找不到或已销毁就放弃，返回是否送达 */
function pushTo(key, channel, ...args) {
  const win = getWindow(key);
  if (!win || win.isDestroyed()) {
    return false;
  }
  win.webContents.send(channel, ...args);
  return true;
}

/** 全员广播：getAllWindows 返回框架维护的存活清单，天然不含已销毁窗口 */
function broadcast(channel, ...args) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args);
  }
}

/**
 * 就绪门控：把「推送当前状态」挂到 did-finish-load 上。
 * 每次页面加载完成（首次加载、刷新、导航）都会补推一次，
 * getState 每次调用都取最新值，避免补推时送出过期状态。
 */
function pushStateWhenReady(win, channel, getState) {
  win.webContents.on('did-finish-load', () => {
    win.webContents.send(channel, getState());
  });
}

module.exports = { pushTo, broadcast, pushStateWhenReady };
