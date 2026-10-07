/**
 * 参考实现（主进程）：通知与角标都在主进程收口。
 * 输入：渲染端经 IPC 触发「发通知」「请求关注」；
 * 操作：构造 Notification 并 show()，维护未读数并按平台刷新角标，处理 click；
 * 预期：通知点击后窗口到前台、未读清零、角标同步隐藏；
 *       macOS 应用未聚焦时 Dock 弹跳一次；Windows 用覆盖图标表达未读。
 * 阅读主线：渲染端只表达意图，签名、isSupported、平台分支这些细节不出主进程。
 */
const { app, BrowserWindow, Notification, ipcMain, nativeImage } = require('electron');

// Windows 的通知身份：Squirrel 打包环境会自动调用 setAppUserModelId，
// 开发模式要自己给一个，否则通知可能不显示或显示成 "Electron"（见正文）
if (process.platform === 'win32' && !app.isPackaged) {
  app.setAppUserModelId(process.execPath);
}

// 未读数的唯一真相在主进程：谁发消息谁加一，用户点通知清零
let unread = 0;

function mainWindow() {
  return BrowserWindow.getAllWindows()[0];
}

// 16×16 覆盖图标从应用资源加载；传 null 给 setOverlayIcon 即可清除
function unreadOverlayIcon() {
  return nativeImage.createFromPath('assets/badge-16x16.png');
}

function refreshBadge() {
  if (process.platform === 'darwin') {
    // macOS：Dock 红点数字；传 0 隐藏
    app.setBadgeCount(unread);
  } else if (process.platform === 'win32') {
    // Windows 没有 Dock 角标：用任务栏覆盖图标表达未读
    mainWindow()?.setOverlayIcon(unread > 0 ? unreadOverlayIcon() : null, `${unread} 条未读`);
  }
  // Linux：setBadgeCount 只在支持 LauncherEntry D-Bus 的环境生效，直接调不报错
}

ipcMain.handle('notify:send', (_event, { title, body }) => {
  // 不支持的系统（isSupported() 为 false）直接降级，不构造、不 show
  if (!Notification.isSupported()) {
    return { ok: false, reason: 'UNSUPPORTED' };
  }
  unread += 1;
  refreshBadge();

  const notification = new Notification({ title, body });
  // 点击不会自动聚焦窗口：恢复窗口和清角标都是你自己在回调里做的事
  notification.on('click', () => {
    unread = 0;
    refreshBadge();
    mainWindow()?.show();
  });
  // macOS 未签名二进制等场景会走到 failed，别让失败静默
  notification.on('failed', (_notifyEvent, error) => {
    console.error('通知展示失败：', error);
  });
  notification.show();
  return { ok: true, unread };
});

ipcMain.handle('notify:bounce', () => {
  // Dock API 仅 macOS 存在：其他平台 app.dock 是 undefined
  if (process.platform !== 'darwin' || !app.dock) {
    return null;
  }
  // 应用聚焦中会返回 -1；informational 弹约 1 秒，critical 持续到激活或 cancelBounce
  const id = app.dock.bounce('informational');
  return id;
});
