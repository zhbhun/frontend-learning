/**
 * handler 返回形态对照：同一个 app:// 协议，不同的返回页面各拿到什么。
 * 前置：沿用快速上手的特权声明（registerSchemesAsPrivileged 要留在文件顶部）。
 * 操作：把 src/index.js 里 protocol.handle 的处理器换成下面的版本，重启后依次访问
 *       app://bundle/hello、app://bundle/missing.txt、app://bundle/../secret.txt。
 * 预期结果：/hello 渲染为标题（content-type 正确）；missing.txt 得到显式 404；
 *       越界路径得到 400；放开 unhandle 注释后 isProtocolHandled 变 false，
 *       同一地址不再有处理器接管。
 * 阅读主线：内联 HTML → 404（net.fetch 失败的转换）→ 400（越界）→ unhandle。
 */
const { app, BrowserWindow, net, protocol } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { host, pathname } = new URL(request.url);

    if (host !== 'bundle') {
      return new Response('unknown host', { status: 404 });
    }

    // 内联内容：new Response(字符串) 不带 content-type 时按纯文本处理，HTML 不会渲染
    if (pathname === '/hello') {
      return new Response('<h1>你好，app://</h1>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    // 越界路径在读盘之前挡下，返回显式的 400
    const pathToServe = path.join(__dirname, pathname);
    const relativePath = path.relative(__dirname, pathToServe);
    const isSafe =
      relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    if (!isSafe) {
      return new Response('forbidden', { status: 400 });
    }

    // 读不到的文件：net.fetch 的请求会失败（Promise reject），转成显式的 404 Response
    return net
      .fetch(pathToFileURL(pathToServe).toString())
      .catch(() => new Response('not found', { status: 404 }));
  });

  console.log('app:// 注册了吗：', protocol.isProtocolHandled('app')); // true

  // 卸载处理器：此后同一协议不再有处理器接管，isProtocolHandled 变 false；
  // 需要时可以再次 protocol.handle 重新注册。想试验就放开下面两行注释。
  // protocol.unhandle('app');
  // console.log('app:// 还在吗：', protocol.isProtocolHandled('app')); // false

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadURL('app://bundle/hello');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
