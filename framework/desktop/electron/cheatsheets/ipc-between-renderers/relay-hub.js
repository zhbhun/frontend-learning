/**
 * 参考实现：主进程中转的「转发中心」——窗口 A 与窗口 B 之间所有消息的中转站。
 * 输入/前置：沿用「多窗口」课的注册表惯例（Map：业务 key → BrowserWindow 实例），
 *           此处自带最小实现便于对照运行；窗口按 key 登记与注销。
 * 操作：registerRelayHub() 在主进程模块顶层调用一次；窗口 A 的页面经 preload
 *       暴露面 send，窗口 B 的页面经暴露面订阅。
 * 预期结果：每条消息都经过主进程——终端留痕、可校验来源、可定向或广播；
 *           接收端窗口不存在时消息直接丢弃（不排队，与推送同规则）。
 * 阅读主线：路由决策集中在主进程一个模块；页面与预加载不出现转发逻辑。
 */
const { ipcMain, BrowserWindow } = require('electron');

// ---- 窗口注册表（「多窗口」课的惯例，最小实现）----
const windows = new Map(); // 业务 key → BrowserWindow 实例

function registerWindow(key, win) {
  windows.set(key, win); // 创建即登记
  win.on('closed', () => windows.delete(key)); // closed 即注销，防幽灵引用
}

function getWindow(key) {
  const win = windows.get(key);
  return win && !win.isDestroyed() ? win : undefined; // 取用带 isDestroyed() 兜底
}

// ---- 转发中心 ----
function registerRelayHub() {
  // 固定路由：通道名即路由，'chat:to-settings' 永远转发给设置窗口
  ipcMain.on('chat:to-settings', (event, text) => {
    audit(event, '固定路由 chat:to-settings');
    relayTo('settings', 'chat:incoming', text);
  });

  // 点名路由：消息自带目标 key，由注册表解析；目标未知时丢弃
  ipcMain.on('chat:route', (event, payload) => {
    audit(event, `点名路由 → ${payload.to}`);
    relayTo(payload.to, 'chat:incoming', payload.text);
  });

  // 回音（确认类）：来源就在事件对象上，reply 直接回给发来消息的窗口与 frame
  ipcMain.on('chat:ack', (event, id) => {
    audit(event, '回音 → 来源窗口');
    event.reply('chat:ack', id);
  });

  // 通知类（改了主题，其他窗口都要知道）：反方向再走一遍中转
  ipcMain.on('settings:theme-changed', (event, theme) => {
    audit(event, '通知其余窗口 theme-changed');
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents !== event.sender) {
        win.webContents.send('theme-changed', theme);
      }
    }
  });
}

// 定向转发：接收端不在就丢弃——窗口间消息同样不排队、不缓存
function relayTo(key, channel, ...args) {
  const target = getWindow(key);
  if (!target) return false;
  target.webContents.send(channel, ...args);
  return true;
}

// 中转的天然优势：每条消息都留下痕迹，也是校验来源的卡点（「IPC 概念」的安全边界）
function audit(event, label) {
  const known = [...windows.values()].some(
    (win) => win.webContents === event.sender,
  );
  if (!known) {
    console.warn('[relay] 丢弃未知来源的消息');
    return;
  }
  console.log(`[relay] ${label}`);
}

module.exports = { registerWindow, getWindow, registerRelayHub };
