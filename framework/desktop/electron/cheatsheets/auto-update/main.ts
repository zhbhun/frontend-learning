/**
 * 范例：应用端接入自动更新（放进 vite-typescript 模板的 src/main.ts）。
 *
 * 演示内容：更新代码的打包守卫、update-electron-app 的初始化，
 * 以及自建 feed 时改用裸 autoUpdater 的等价写法。
 * 前置状态：npm install --save update-electron-app；macOS 构建已签名（8.3）；
 *           默认更新源 update.electronjs.org 要求 package.json 的 repository 指向公开 GitHub 仓库。
 * 主要观察：打包安装后启动应用——启动即检查一次，之后每 10 分钟一次；
 *           服务端有新版本时后台下载，完成后弹出"重启 / 稍后"对话框；开发模式不检查。
 * 阅读主线：isPackaged 守卫 → updateElectronApp() 三行默认场景 →
 *           文件末尾的裸 autoUpdater 变体只在自建 feed 时替换使用。
 */
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

import { updateElectronApp } from 'update-electron-app';

// Squirrel.Windows 在安装、更新、卸载时会以 --squirrel-* 特殊参数启动应用执行安装动作，
// 这类运行必须立即退出；vite-typescript 模板自带这段，不要删（见课程 Windows 一节）
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(() => {
  createWindow();

  // 更新检查只在打包应用上运行：开发模式（forge start）的请求必然失败或没有意义
  // （见课程常见问题）
  if (app.isPackaged) {
    // 默认接 update.electronjs.org：仓库地址取自 package.json 的 repository 字段，
    // 启动即检查一次，之后每 10 分钟一次；下载完成后 notifyUser 弹"重启 / 稍后"对话框。
    // 选项默认值见课程表格。
    updateElectronApp({
      // updateInterval: '30 minutes',
      // logger: require('electron-log'),
      // notifyUser: true,
    });
  }

  app.on('activate', () => {
    // macOS 上点 Dock 图标且无窗口时重新创建
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/*
 * 自建更新服务器（或静态存储直连）时不用 update-electron-app，
 * 在同一位置替换为裸 autoUpdater。error 事件必须监听，否则链路失败无声：
 *
 * import { app, autoUpdater, dialog } from 'electron';
 *
 * if (app.isPackaged) {
 *   autoUpdater.setFeedURL({
 *     // 地址带上平台与版本，服务端据此返回对应平台的元数据（见课程自建更新服务器一节）
 *     url: `https://my-server.example.com/update/${process.platform}/${app.getVersion()}`,
 *   });
 *   autoUpdater.on('update-downloaded', async () => {
 *     const { response } = await dialog.showMessageBox({
 *       type: 'info',
 *       title: '有可用更新',
 *       message: '新版本已下载，是否立即重启安装？',
 *       buttons: ['立即重启', '稍后'],
 *       defaultId: 0,
 *     });
 *     if (response === 0) autoUpdater.quitAndInstall();
 *   });
 *   autoUpdater.on('error', (error) => {
 *     console.error('[autoUpdater]', error);
 *   });
 *   autoUpdater.checkForUpdates();
 * }
 */
