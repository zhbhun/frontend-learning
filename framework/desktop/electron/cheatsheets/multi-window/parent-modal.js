/**
 * 参考实现：父子窗口与模态窗口的最小对照。
 * 演示内容：同一个父窗口分别以「非模态子窗口」和「模态子窗口」方式打开设置窗口，
 *   对照两者在层级归属与父窗口输入上的差异。
 * 前置状态：沿用「创建窗口」课程的 Forge 项目，mainWindow 已创建；
 *   把本文件与 settings.html 拷入 src/，由主进程 require 并调用。
 * 主要操作：分别调用 openChildWindow(mainWindow) 与 openModalWindow(mainWindow)，
 *   然后移动父窗口、尝试点击父窗口。
 * 预期结果：两种子窗口都始终叠在父窗口之上；macOS 上拖动父窗口时子窗口跟随移动
 *   （Windows/Linux 上不动）；模态窗口打开期间父窗口不可交互，
 *   macOS 上以 sheet 形式附着在父窗口上，关闭后父窗口恢复可交互。
 * 阅读主线：两种窗口只差一个 modal 选项——关系都在创建时声明。
 */
const path = require('path');
const { BrowserWindow } = require('electron');

// 非模态子窗口：叠在父窗口之上，父窗口仍可正常交互
function openChildWindow(parentWindow) {
  const child = new BrowserWindow({
    width: 360,
    height: 240,
    parent: parentWindow, // 声明父子关系：子窗口永远叠在父窗口之上
    show: false,
  });

  child.once('ready-to-show', () => {
    child.show();
  });

  child.loadFile(path.join(__dirname, 'settings.html'));
  return child;
}

// 模态子窗口：在父子关系之上追加输入阻断——父窗口在它关闭前不可交互
function openModalWindow(parentWindow) {
  const modal = new BrowserWindow({
    width: 360,
    height: 200,
    parent: parentWindow,
    modal: true, // 必须与 parent 同时设置才生效
    show: false,
  });

  modal.once('ready-to-show', () => {
    modal.show();
  });

  modal.loadFile(path.join(__dirname, 'settings.html'));
  return modal;
}

module.exports = { openChildWindow, openModalWindow };
