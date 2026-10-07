/**
 * 范例介绍：主进程经 WebFrameMain 观察与操作子 frame，与宿主页面 JS 的同源策略并排对照。
 * 前置：宿主页面用同目录的 iframe-host.html（内嵌一个第三方 iframe），需要联网。
 * 操作：运行后观察终端的 frame 树枚举、嵌入被拒的信号与跨源取值结果。
 * 预期：主进程能列出每个子 frame 的 URL 与 origin，也能在跨源 frame 里执行代码；
 *       同源策略只约束"页面 JS 之间"，不约束主进程。
 * 阅读主线：跨源 iframe 对宿主 JS 不透明，对主进程透明——权限差异就在这一条线上。
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 960, height: 680 });
  win.loadFile(path.join(__dirname, 'iframe-host.html'));

  // 嵌入被拒（X-Frame-Options / frame-ancestors）的可靠信号在这里，不在页面侧
  win.webContents.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
    if (!isMainFrame) console.log('[子 frame 被拒]', code, desc, url);
  });

  win.webContents.on('did-finish-load', async () => {
    const { mainFrame } = win.webContents;
    console.log('[主 frame]', mainFrame.url);

    // mainFrame.frames 是直接子 frame；framesInSubtree 是含自身的整棵子树
    for (const frame of mainFrame.frames) {
      console.log('[子 frame]', frame.url, '· origin:', frame.origin);

      // 跨源也没关系：执行发生在该 frame 的页面世界里，返回值是最后一个表达式的值
      const title = await frame
        .executeJavaScript('document.title')
        .catch(() => '(frame 已销毁或加载未完成)');
      console.log('[子 frame 标题]', title);
    }
  });
});
