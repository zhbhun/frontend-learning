/**
 * 参考实现：多窗口的引用容器（注册表）。
 * 演示内容：以业务 key 登记窗口，closed 时注销，让引用集合与真实窗口保持一致。
 * 前置状态：沿用「创建窗口」课程的 Forge 项目；把本文件拷入 src/，由主进程 require。
 * 主要操作：createWindow('settings', { ... }) 创建并登记；关闭窗口时自动注销。
 * 预期结果：窗口存续期间 getWindow(key) 返回实例；关闭后返回 undefined，
 *   遍历 listWindows() 不会撞上已销毁的实例。
 * 阅读主线：new、登记（set）、注销（closed 里的 delete）永远成对出现。
 */
const path = require('path');
const { BrowserWindow } = require('electron');

// 业务 key（如 'main'、'settings'）→ BrowserWindow 实例。
// getAllWindows() 只回答"现在开着哪几个"，业务身份（哪个是设置窗口）只有这份注册表知道。
const windows = new Map();

function createWindow(key, options = {}) {
  // 单例保护：同 key 窗口还开着时聚焦而不是重建（见课程「最佳实践」）
  const existing = windows.get(key);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    ...options,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      ...options.webPreferences,
    },
  });

  // 登记纪律：创建即入册。散落在各处的 new BrowserWindow() 是幽灵引用的主要来源，
  // 封装成这一处，让 new 与登记永远一起发生。
  windows.set(key, win);

  // 清理纪律：closed 即销册。窗口关闭即销毁实例，留在 Map 里就是
  // 遍历时报 Object has been destroyed 的幽灵引用。
  win.on('closed', () => {
    windows.delete(key);
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

// 取用入口统一走这里：isDestroyed() 兜底，防御注册表与真实状态短暂不一致
function getWindow(key) {
  const win = windows.get(key);
  return win && !win.isDestroyed() ? win : undefined;
}

function listWindows() {
  return [...windows.values()];
}

module.exports = { createWindow, getWindow, listWindows };
