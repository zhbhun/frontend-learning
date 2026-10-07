/**
 * 创建窗口参考实现：BrowserWindow 常用 options 与加载内容的完整落点。
 *
 * 前置状态：依赖 Electron 运行时与同目录的 index.html、preload.js（没有
 * preload.js 时删掉 webPreferences 一行即可）。
 * 运行方式：放进 Forge 项目的 src/ 目录替换 index.js（npm start 或 rs 重启）；
 * 或任意目录配好 package.json（main 指向本文件、devDependencies 含 electron）后
 * 用 electron . 运行。
 *
 * 预期结果：约 900×620 的窗口在页面渲染完成后无白闪地出现；拖拽缩到
 * 640×400 被顶住；Windows/Linux 上窗口内菜单栏默认隐藏（按 Alt 呼出），
 * macOS 菜单在屏幕顶部、不受该参数影响。
 *
 * 阅读主线：options 定外壳 → loadFile 定内容 → ready-to-show 定显示时机 →
 * closed 清理引用。window-all-closed / activate 属于生命周期事件，
 * 完整规则见「应用生命周期」课程。
 */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

// 模块级变量持有窗口引用：防止窗口被垃圾回收，也便于 closed 里置空
let mainWindow = null;

const createWindow = () => {
  // options 决定窗口外壳，创建时一次性给定，之后没有 setter 可改
  mainWindow = new BrowserWindow({
    width: 900, // 初始宽度，默认 800（逻辑像素，默认指整个窗口）
    height: 620, // 初始高度，默认 600
    minWidth: 640, // 最小尺寸，拖拽与 setSize 都受约束
    minHeight: 400,
    useContentSize: false, // true 时 width/height 按页面内容区计算
    // x: 100,             // 初始位置，x/y 必须成对设置；不设置时窗口居中
    // y: 100,
    title: '我的应用', // 默认标题；页面加载后会被 HTML 的 <title> 覆盖
    backgroundColor: '#f5f5f5', // 窗口底色（CSS 颜色格式），显示前已生效
    autoHideMenuBar: true, // 仅 Windows/Linux：按 Alt 才显示窗口内菜单栏
    show: false, // 先创建为隐藏窗口，等页面渲染完成再显示，避免白闪
    webPreferences: {
      // preload 必须是绝对路径，惯例用 path.join(__dirname, ...) 拼出
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // ready-to-show：页面已渲染完成、可无视觉闪烁地显示。
  // 它排在加载完成之后：窗口不出现时先查 loadFile 的 Promise 是否 reject。
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 固定窗口标题：阻止页面 <title> 改写窗口标题（页面标题变化时触发）
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // 窗口已关闭、实例随之销毁：移除引用，之后访问会抛 Object has been destroyed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // loadFile 的相对路径按应用根目录（package.json 所在目录）解析，
  // 主脚本在 src/ 下时用 __dirname 拼绝对路径最稳。
  // loadURL('https://example.com') 可换成远程地址，同样返回 Promise。
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 窗口内容归 webContents 管，DevTools 也在它上面打开（调试时用）
  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(createWindow);

// macOS 惯例：点 Dock 图标且无窗口时重建（生命周期规则见「应用生命周期」）
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// macOS 惯例：关窗不退出，其余平台退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
