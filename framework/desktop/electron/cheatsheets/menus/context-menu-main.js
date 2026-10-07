/**
 * 上下文菜单参考实现（主进程侧）：两条触发路径与按 params 定制。
 *
 * 前置状态：沿用前面课程的 Forge 项目（src/index.html + src/preload.js）；
 * 渲染端路径需要配套的 context-menu-preload.js（webPreferences.preload
 * 指向它，或改回 preload.js 并把本文件的暴露面对照迁移）。
 * 运行方式：放进 Forge 项目的 src/ 目录替换 index.js，npm start 后主进程
 * 改动用 rs 重启。
 *
 * 预期结果：右键页面任意位置弹出编辑角色菜单（渲染端路径，popup 不传
 * x/y 默认弹在光标处）；注释掉 ipcMain.on 后，主进程路径接管——右键
 * 输入框或选中文本才弹编辑项，右键链接才弹「打开链接」。
 *
 * 阅读主线：先跑路径一（页面触发、主进程弹出），再切到路径二
 * （webContents 的 context-menu 事件）对比 params 的定制能力。
 */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'context-menu-preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  // ---- 路径二：主进程直接监听 context-menu 事件，按 params 定制内容 ----
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const template = [];

    // 可编辑元素或选中文本：给编辑角色项
    if (params.isEditable || params.selectionText) {
      template.push({ role: 'copy' }, { role: 'cut' }, { type: 'separator' });
    }

    // 链接：给打开项（shell.openExternal 的完整用法见「打开外部资源」）
    if (params.linkURL) {
      template.push({
        label: '打开链接',
        click: () => shell.openExternal(params.linkURL),
      });
    }

    if (template.length > 0) {
      // 不传 x/y：默认弹在当前光标位置
      Menu.buildFromTemplate(template).popup({ window: mainWindow });
    }
  });
};

// ---- 路径一：渲染端 contextmenu 事件经 IPC 触发 ----
// 页面在 window 上右键时经 preload 调 window.contextMenu.open(payload)
ipcMain.on('context-menu:open', (event) => {
  const editMenu = Menu.buildFromTemplate([
    { role: 'copy' },
    { role: 'cut' },
    { role: 'paste' },
    { role: 'selectAll' },
  ]);

  editMenu.popup({
    // 多窗口时从事件找回发起请求的那个窗口（见「多窗口」）
    window: BrowserWindow.fromWebContents(event.sender),
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
