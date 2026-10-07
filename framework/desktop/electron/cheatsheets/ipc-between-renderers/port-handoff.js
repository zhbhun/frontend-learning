/**
 * 参考实现：MessagePort 直连——主进程只在建立阶段移交一对端口。
 * 输入/前置：两个窗口各自加载页面，共享同一份 preload（本课目录 port-preload.js）。
 * 操作：每个窗口 did-finish-load 后握手一次，为主进程创建的 MessageChannelMain
 *       两端各移交一个端口（移交即转让所有权）。
 * 预期结果：此后窗口 A 与窗口 B 经端口专线直接互发消息，主进程不再参与、
 *           也看不到消息内容；任一窗口刷新会触发新一次握手，两端换上新端口。
 * 阅读主线：建立（移交）与使用（专线）是两个阶段——主进程只出现在第一阶段。
 */
const { MessageChannelMain } = require('electron');

function connectTwoWindows(windowA, windowB) {
  // 每次握手都发「新一代」端口：窗口刷新销毁旧页面上下文，旧端口随之失效；
  // 两端各领新端口，专线自动接回——主进程无需记账（旧端口所有权早已移交）。
  const handshake = (win, peer) => {
    if (!win || !peer || win.isDestroyed() || peer.isDestroyed()) return;

    const { port1, port2 } = new MessageChannelMain(); // 一对相连的端口
    win.webContents.postMessage('port', null, [port1]); // 移交：此后主进程不能用 port1
    peer.webContents.postMessage('port', null, [port2]); // 渲染端拿到的是原生 DOM MessagePort

    console.log('[handoff] 已移交一对新端口');
  };

  // 移交时机复用推送的门控纪律：页面加载完成后才有监听器接住端口。
  // 官方教程用 ready-to-show，同一个门控思想（「主进程推送」课的时机三法）。
  windowA.webContents.on('did-finish-load', () => handshake(windowA, windowB));
  windowB.webContents.on('did-finish-load', () => handshake(windowB, windowA));
}

module.exports = { connectTwoWindows };
