/**
 * 快速上手：注册 app:// 协议并用 loadURL 加载打包内页面。
 * 前置：沿用「安装」课的 Forge 项目（src/index.js + src/index.html + src/preload.js）。
 * 操作：把本文件内容整体替换 src/index.js，在运行 start 的终端输入 rs 重启主进程。
 * 预期结果：窗口显示 Hello World 页面；DevTools Network 里页面与脚本都来自
 * app://bundle/...；Console 里 location.origin 是 app://bundle 而不是 null。
 * 阅读主线：特权声明（文件顶部、ready 前）→ handle 处理器 → loadURL。
 */
const { app, BrowserWindow, net, protocol } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// 特权声明必须写在 app ready 之前，且整个应用只能调用一次——惯例是放主进程文件顶部。
// standard: true 让 app:// 按 URL 规范解析，页面的相对引用才指向包内路径。
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // host=bundle 是「资源包名」，pathname=/index.html 是包内路径
  mainWindow.loadURL('app://bundle/index.html');
};

app.whenReady().then(() => {
  // protocol 模块操作 defaultSession；自定义分区的窗口要改用 ses.protocol.handle
  protocol.handle('app', (request) => {
    const { host, pathname } = new URL(request.url);

    if (host !== 'bundle') {
      return new Response('unknown host', { status: 404 });
    }

    if (pathname === '/') {
      return new Response('<h1>app:// 就绪</h1>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    // 防路径穿越：app://bundle/../secret.txt 这类请求要挡在读盘之前
    const pathToServe = path.join(__dirname, pathname);
    const relativePath = path.relative(__dirname, pathToServe);
    const isSafe =
      relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    if (!isSafe) {
      return new Response('forbidden', { status: 400 });
    }

    // file: URL 经 Chromium 网络栈读盘，按扩展名自动补 content-type
    return net.fetch(pathToFileURL(pathToServe).toString());
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
