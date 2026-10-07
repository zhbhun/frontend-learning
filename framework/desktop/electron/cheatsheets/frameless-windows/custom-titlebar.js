// 快速上手参考实现：隐藏系统标题栏的自定义标题栏窗口（主进程侧）。
// 前置状态：沿用 Forge 模板项目（src/index.js 入口，模板已接好 src/preload.js）。
// 操作：用本文件内容替换 createWindow 部分，并在 src/index.html 加标题栏元素、
//       src/index.css 加「定义拖拽与点击」一节里的样式。
// 预期结果：标题栏整条可拖动窗口；macOS 左上角保留交通灯；
//           Windows/Linux 右上角出现原生窗口控制按钮（overlay）。
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 640,
    minHeight: 400,
    show: false,
    // 隐藏系统标题栏：内容区占满全窗
    titleBarStyle: 'hidden',
    // Windows/Linux 用原生 overlay 拿回窗口控制按钮；
    // macOS 的交通灯随 titleBarStyle: 'hidden' 自动保留，无需 overlay
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // macOS：点 Dock 图标时没有窗口就重建一个（见「应用生命周期」）
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
