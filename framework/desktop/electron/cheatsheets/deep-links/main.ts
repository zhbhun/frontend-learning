/**
 * 范例：深链与单实例锁的主进程骨架（放进 vite-typescript 模板的 src/main.ts）。
 *
 * 演示内容：注册协议处理、单实例锁，macOS open-url 与 Windows/Linux 的
 * second-instance / 冷启动 argv 两条送达路径，以及「URL → 窗口 → 渲染端」的路由。
 * 前置状态：SCHEME 常量与打包配置一致（本课示例为 'myapp'，见 forge.config.mts）；
 *           macOS 的注册只在打包后生效——开发模式点深链不会有反应，属预期。
 * 主要观察：打包安装后在浏览器或终端打开 myapp://task/42——已有实例被唤到前台
 *           并跳到 /task/42；无实例时应用启动后同样落到该路由。
 * 阅读主线：锁（去留）→ 注册（入口）→ open-url / second-instance（送达）→
 *           冷启动 argv（自取）→ routeDeepLink（窗口与渲染端）。
 */
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

// Squirrel.Windows 安装、更新、卸载会以 --squirrel-* 参数启动应用（见自动更新课），不要删
if (require('electron-squirrel-startup')) {
  app.quit();
}

const SCHEME = 'myapp';

let mainWindow: BrowserWindow | null = null;
// 冷启动时 URL 可能先于窗口到达（macOS 的 open-url 早于 ready）：先暂存，窗口加载完再路由
let pendingUrl: string | null = null;

// argv 可能被 Chromium 附加参数污染、顺序不保证：按 scheme 前缀找，不取"末项"
function extractDeepLink(argv: string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${SCHEME}://`)) ?? null;
}

function routeDeepLink(rawUrl: string): void {
  if (!mainWindow) {
    pendingUrl = rawUrl;
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  // 窗口还没加载完成时渲染端收不到推送：等 did-finish-load 再发
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('deep-link', rawUrl);
    });
  } else {
    mainWindow.webContents.send('deep-link', rawUrl);
  }
}

function handleDeepLink(rawUrl: string): void {
  // 深链是外部输入，先校验再路由：示例只放行 myapp://task/... 形态
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  if (url.protocol !== `${SCHEME}:` || url.host !== 'task') return;
  routeDeepLink(rawUrl);
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// —— 单实例锁：放最前。false 说明已有实例持锁，本进程只是深链的"信使"，送达后退出 ——
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // —— 注册协议：macOS 只认打包期写入 Info.plist 的协议，此调用对开发模式无效 ——
  if (process.defaultApp) {
    // 开发模式（electron .）：把入口脚本一起登记，深链才能带参启动你的代码；
    // 只对 Windows / Linux 有意义，macOS 上仍受 Info.plist 约束（见课程正文）
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    // 打包应用：默认登记当前可执行文件即可
    app.setAsDefaultProtocolClient(SCHEME);
  }

  // macOS：URL 送达事件。监听必须注册在 ready 之前，否则会错过"由深链拉起应用"的那次
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Windows / Linux：第二实例的参数送达首实例（保证在 ready 之后触发）
  app.on('second-instance', (_event, argv) => {
    const url = extractDeepLink(argv);
    if (url) handleDeepLink(url);
  });

  app.whenReady().then(() => {
    createWindow();

    // Windows / Linux 冷启动：没有实例在跑，深链 URL 就在自己的启动参数里
    const coldUrl = extractDeepLink(process.argv);
    if (coldUrl) pendingUrl = coldUrl;

    // 消费暂存的 URL（routeDeepLink 内部会等窗口加载完成再推送）
    if (pendingUrl) {
      const url = pendingUrl;
      pendingUrl = null;
      handleDeepLink(url);
    }
  });

  // macOS：点 Dock 图标且无窗口时重新创建（窗口恢复见应用生命周期课）
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
