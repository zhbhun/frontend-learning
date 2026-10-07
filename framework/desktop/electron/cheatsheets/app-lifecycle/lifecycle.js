/**
 * 应用生命周期参考实现：app 模块的启动、去留与退出链路。
 *
 * 前置状态：依赖 Electron 运行时与同目录的 index.html（不需要 preload，
 * 没有该文件时删掉 webPreferences 两行即可）。
 * 运行方式：放进 Forge 项目的 src/ 目录替换 index.js，npm start 后主进程
 * 改动用 rs 重启；所有 [lifecycle] 日志都打在运行 npm start 的终端里。
 *
 * 预期结果：终端先出现「模块顶层」再出现 ready；Windows/Linux 上点窗口
 * 关闭按钮，依次出现 window-all-closed → before-quit → will-quit → quit，
 * npm start 结束、退出码 0；macOS 上关窗只出现 window-all-closed，应用
 * 常驻，点 Dock 图标触发 activate 并重建窗口；Cmd+Q 走 before-quit →
 * will-quit → quit，这条路径没有 window-all-closed。
 *
 * 阅读主线：ready 定起点 → window-all-closed 定去留 → activate 定 macOS
 * 恢复 → before-quit / close / will-quit 是退出的三道拦截点 →
 * app.exit() 绕过全部链路（对照用，默认注释）。
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

let mainWindow = null;

const log = (name, detail = '') =>
  console.log(`[lifecycle] ${name}${detail ? `：${detail}` : ''}`);

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 窗口已关闭、实例销毁后移除引用；窗口级细节见「创建窗口」课程
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

// 模块顶层的代码先于 ready 执行（ready 在事件循环第一 tick 之后触发）：
// 需要赶在一切之前做的事写在这里，需要初始化完成才能做的事放进 whenReady
log('模块顶层', '进程已启动，等待初始化完成');

app.whenReady().then(() => {
  log('ready', `初始化完成（isReady: ${app.isReady()}）`);
  createWindow();

  // 仅 macOS：首次启动、运行中再次拉起、点 Dock 图标都会触发。
  // 惯例是无窗口时重建；注册在 whenReady 里，正好覆盖启动与再激活两种来源
  app.on('activate', (_event, hasVisibleWindows) => {
    log('activate', `应用被激活（hasVisibleWindows: ${hasVisibleWindows}）`);
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 最后一个窗口关闭后触发。不订阅时默认退出；订阅后去留完全由这里决定。
// quit 链路（Cmd+Q / app.quit()）不会走到这里——别把退出清理挂在这个事件里
app.on('window-all-closed', () => {
  log('window-all-closed', `platform: ${process.platform}`);
  if (process.platform !== 'darwin') {
    app.quit(); // Windows/Linux 惯例：关窗即退出
  }
  // darwin：什么都不做 = 应用无窗口常驻，等 activate 重建或 Cmd+Q 退出
});

// ---- 退出链路：before-quit → 逐窗 close → will-quit → quit ----

app.on('before-quit', (event) => {
  log('before-quit', '退出开始、窗口尚未关闭，整体取消的最后机会之一');

  // 应用级「确认保存」的挂点：把下面的标志改成 true 并 rs 重启即可体验
  // 拦截——退出被拦下后，用户确认时先清标志再 app.quit()，否则会再次被拦
  const hasUnsavedChanges = false;
  if (hasUnsavedChanges) {
    event.preventDefault(); // 确认对话框（dialog）见「文件与对话框」课程
    log('before-quit', '有未保存内容，已拦截退出');
  }
});

app.on('will-quit', (event) => {
  log('will-quit', '窗口全部关闭，即将退出——最后一道可取消的关口');
  // event.preventDefault(); // 取消后应用继续运行；退出清理适合挂在这附近
});

app.on('quit', (_event, exitCode) => {
  log('quit', `正在退出（exitCode: ${exitCode}）`); // 之后进程结束
});

// 硬退出对照：取消注释后任意操作都会立即结束进程，上面四个事件一个都
// 不会触发，未保存内容直接丢失——常规退出不要用它
// app.exit(0);

// 应用重启是 app.relaunch() + 退出的组合：relaunch 只安排下次启动，
// 自己不结束当前进程（完整用法见「自动更新」课程）
