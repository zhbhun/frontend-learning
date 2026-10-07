/**
 * 范例介绍：主进程手持 win.webContents 做三类事——监听加载生命周期、感知导航、执行页面代码。
 * 输入：Forge 模板项目（src/index.js 的 createWindow 已创建窗口并 loadFile）。
 * 操作：把 watchPage(mainWindow) 接进 createWindow（挂在 loadFile 之前）后重启应用（npm start，主进程改动需在终端输入 rs）。
 * 预期：终端按时间线打印加载事件；窗口标题在加载完成后被主进程改写。
 * 阅读主线：窗口外壳归 BrowserWindow，页面这一层归 win.webContents。
 */

function watchPage(mainWindow) {
  const { webContents } = mainWindow;

  // —— 加载生命周期：一条加载的时间线（输出打在终端，不在页面 DevTools）——
  webContents.on('did-start-loading', () => console.log('[加载] 开始'));
  webContents.on('dom-ready', () => console.log('[加载] DOM 就绪'));
  webContents.on('did-finish-load', () => console.log('[加载] 完成（onload 已分发）'));
  webContents.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
    if (!isMainFrame) return; // 子 frame 的失败也走这里，只关心主 frame
    console.error('[加载] 失败', code, desc, url);
  });
  webContents.on('did-stop-loading', () => console.log('[加载] 结束'));

  // —— 导航：感知"页面要去哪"（loadURL 等程序化导航不触发 will-navigate）——
  webContents.on('will-navigate', (event, url) => {
    console.log('[导航] 页面想跳转', url); // 拦截用 event.preventDefault()，完整策略见「导航与弹窗控制」
  });
  webContents.on('did-navigate', (_event, url, code) => {
    console.log('[导航] 完成', url, `HTTP ${code}`); // 非 HTTP 导航 code 为 -1
  });
  webContents.on('did-navigate-in-page', (_event, url) => {
    console.log('[导航] 页内跳转', url); // 锚点、hash、SPA 路由，页面不重载
  });

  // —— 控制：加载完成后从主进程执行一段页面代码（默认世界）——
  webContents.on('did-finish-load', async () => {
    await webContents.executeJavaScript("document.title = '由主进程改写'");
    console.log('[控制] executeJavaScript 已执行，窗口标题应已变化');
  });
}

module.exports = { watchPage };
