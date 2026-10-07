/**
 * 参考实现：托盘常驻应用的完整主进程——托盘图标 + 托盘菜单 + 关闭到托盘。
 *
 * 输入与前置状态：沿用 Forge 脚手架项目（src/index.js + index.html）；把本课
 * 目录下的 icon.png / icon@2x.png / iconTemplate.png / iconTemplate@2x.png
 * 复制到 src/ 与本文件同级。
 * 主要操作：启动后点击窗口关闭按钮（改写为隐藏）、点击托盘菜单
 * 「显示主窗口」（恢复）与「退出」（真正退出）。
 * 预期结果：关窗后窗口消失但进程与托盘常驻；「退出」走完整退出链后进程结束。
 * 阅读主线：先看 createTray 的图标与菜单，再看四个挂点（close 拦截、
 * before-quit 标志、window-all-closed 不退出、activate 恢复）如何配合。
 */
const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {Tray | null} */
let tray = null; // 模块级引用：别让 Tray 落进函数局部作用域
// 退出标志：真退出时放行窗口 close（见「关闭到托盘」）
let isQuitting = false;

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  mainWindow.show();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 480,
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 关窗按钮被拦截：改写成隐藏，托盘继续常驻
  mainWindow.on('close', (event) => {
    if (isQuitting) return; // 主动退出：走正常关闭
    event.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  // macOS：文件名以 Template 结尾 → 自动按模板图处理，深浅色菜单栏都清晰；
  // 目录里同时放 icon@2x.png，高分屏自动匹配高清版本
  const iconName = process.platform === 'darwin' ? 'iconTemplate' : 'icon';
  const icon = nativeImage.createFromPath(path.join(__dirname, `${iconName}.png`));
  if (icon.isEmpty()) {
    // createFromPath 对不存在的路径静默返回空图，不报错——先在这里暴露问题
    console.error('[tray] 图标加载为空：检查文件路径与打包后的资源位置');
  }

  tray = new Tray(icon);
  tray.setToolTip('我的托盘应用');

  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: showMainWindow,
    },
    { type: 'separator' },
    {
      // 走完整退出链路：before-quit 里置标志，close 才放行
      label: '退出',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(menu);
}

function enableCloseToTray() {
  // 真退出的入口：任何 quit 路径（托盘菜单 / Cmd+Q）都会先经过这里
  app.on('before-quit', () => {
    isQuitting = true;
  });

  // 常驻声明：窗口全关也不退出（对比「应用生命周期」课的 win32 惯例 quit）
  // close 已被拦截，这个 handler 平时很少触发，是窗口异常销毁后的最后一层保险
  app.on('window-all-closed', () => {});

  // macOS：点 Dock 图标恢复窗口（隐藏的窗口 show，销毁的重建）
  app.on('activate', showMainWindow);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  enableCloseToTray();
});
