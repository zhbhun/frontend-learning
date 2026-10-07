/**
 * 应用菜单参考实现：跨平台模板骨架 + 自定义子菜单（含快速上手的全部观察点）。
 *
 * 前置状态：依赖 Electron 运行时与同目录的 index.html（不需要 preload，
 * 没有该文件时删掉 webPreferences 两行即可）。
 * 运行方式：放进 Forge 项目的 src/ 目录替换 index.js，npm start 后主进程
 * 改动用 rs 重启；所有 [menu] 日志都打在运行 npm start 的终端里。
 *
 * 预期结果：菜单栏被本模板替换——macOS 菜单栏为「应用名 / File / Edit /
 * 选项 / View / Window / Help」，第一个菜单标题是应用名（appMenu role 填充
 * 标准项）；「欢迎语」点击或 Cmd/Ctrl+Shift+W 触发时终端出现日志；
 * 「自动换行」是 checkbox（点击翻转、状态保持）；「小字号/中字号/大字号」
 * 是 radio 同组互斥，「特大字号」被分隔线断成单独一组。
 *
 * 阅读主线：appMenu 平台分支 → 标准整菜单 role → 自定义子菜单
 * （accelerator / checkbox / radio / separator）→ help 菜单 →
 * 运行期用 getMenuItemById 改实例属性（默认注释）。
 */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

let mainWindow = null;

const isMac = process.platform === 'darwin';

const template = [
  // macOS 第一个子菜单的标签永远是应用名，用 appMenu role 填充标准项
  ...(isMac ? [{ role: 'appMenu' }] : []),

  // 官方重建默认菜单的示例：File 菜单在 macOS 用 close 角色、其余平台用 quit
  { role: 'fileMenu' },
  { role: 'editMenu' },

  {
    label: '选项',
    submenu: [
      {
        label: '欢迎语',
        // CommandOrControl：macOS 解析为 Cmd，Windows/Linux 解析为 Ctrl
        accelerator: 'CommandOrControl+Shift+W',
        click: () => console.log('[menu] 欢迎语被点击'),
      },
      { type: 'separator' },
      // checkbox：点击翻转 checked，状态存在 MenuItem 实例上
      { label: '自动换行', type: 'checkbox', checked: true, id: 'auto-wrap' },
      { type: 'separator' },
      // radio：同组互斥 = 同层相邻、中间没有被分隔线隔开
      { type: 'radio', label: '小字号', checked: true },
      { type: 'radio', label: '中字号' },
      { type: 'radio', label: '大字号' },
      // 分隔线是 radio 分组边界：下面一项单独一组，互不影响
      { type: 'separator' },
      { type: 'radio', label: '特大字号' },
    ],
  },

  { role: 'viewMenu' },
  { role: 'windowMenu' },
  {
    role: 'help',
    submenu: [
      {
        label: '学习更多',
        click: async () => {
          await shell.openExternal('https://www.electronjs.org');
        },
      },
    ],
  },
];

// 应用菜单全局唯一：模板一次性构建后设置，先于窗口创建即可
Menu.setApplicationMenu(Menu.buildFromTemplate(template));

// 运行期修改：getApplicationMenu 返回的实例不支持增删项，但属性可以改。
// 例如业务里需要灰置导出、取消勾选自动换行时：
// Menu.getApplicationMenu().getMenuItemById('auto-wrap').checked = false;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
