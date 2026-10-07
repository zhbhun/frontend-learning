/**
 * 范例介绍：把三类口子的完整拦截收进一份主进程实现。
 * 输入：Forge 模板项目（src/index.js + src/preload.js + src/index.html）。
 * 操作：本文件替换 src/index.js 后 npm start；页面里点 target="_blank" 外链、
 *       跳站外域名、申请摄像头 / 通知权限，观察三个口子各自的走向。
 * 预期：外链进系统默认浏览器而不是应用内新窗；站外导航被留在原地；
 *       302 重定向跳白名单外域被取消整个导航；通知权限放行、摄像头被拒。
 * 阅读主线：三个口子都收口在主进程——安全策略挂在 web-contents-created 上
 *       对每个新 webContents 兜底，权限挂在 session 上按会话生效。
 */
const { app, BrowserWindow, shell } = require('electron');

// ---------------------------------------------------------------------------
// 白名单工具：只放行应用自己的 origin；外部打开只放行 http/https。
// 用 new URL() 解析后比较，不做字符串开头匹配——startsWith 可被
// https://example.com.attacker.com 骗过（安全清单第 13 条）。
// ---------------------------------------------------------------------------
const TRUSTED_ORIGIN = 'https://example.com'; // 换成应用自己的线上 origin

function isAllowedOrigin(rawUrl) {
  try {
    return new URL(rawUrl).origin === TRUSTED_ORIGIN;
  } catch {
    return false; // 解析失败：不是合法 URL，一律拒绝
  }
}

function isSafeForExternalOpen(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 口子一 + 口子二：窗口打开与导航。挂在 web-contents-created 上，
// 对每个新建的 webContents 兜底生效（含 webview / WebContentsView 的视图）；
// 个别窗口需要差异化策略时，再把挂载挪进 createWindow 按 webContents 细化。
// ---------------------------------------------------------------------------
app.on('web-contents-created', (_event, contents) => {
  // 口子一：window.open / target="_blank" / 表单 target="_blank"。
  // handler 拿到最终决定权：一律 deny，http(s) 目标校验后转交系统默认浏览器
  // （安全清单第 14 条的官方写法：setImmediate 让拦截先返回，再发起打开）。
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeForExternalOpen(url)) {
      setImmediate(() => shell.openExternal(url));
    }
    return { action: 'deny' };
  });

  // 口子二：用户或页面在主 frame 上发起的导航。白名单外 preventDefault——
  // 拦截后不产生任何加载事件，URL 不变。
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedOrigin(url)) {
      event.preventDefault();
    }
  });

  // 口子二的补口：服务端重定向（如 302）发生在同一次导航中途，
  // 不会再触发 will-navigate——重定向的把关必须用 will-redirect。
  // preventDefault() 取消的是整个导航，不只是重定向。
  contents.on('will-redirect', (event, url) => {
    if (!isAllowedOrigin(url)) {
      event.preventDefault();
    }
  });
});

// ---------------------------------------------------------------------------
// 口子三：权限请求。挂在 session 上按会话生效——defaultSession 只管
// 没有分区的窗口；session.fromPartition(...) 创建的分区会话要各自再设。
// request handler 管真正的授权动作，check handler 管 navigator.permissions
// 一类的同步检查（多数 Web API 先 check、被拒后再 request，两个都要设）。
// ---------------------------------------------------------------------------
function setupPermissionHandlers(session) {
  // request handler：callback(true) 放行、callback(false) 拒绝。
  // callback 必须调用——漏调的分支会让请求悬挂，页面既不弹窗也不被拒。
  session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    console.log('[权限申请]', permission, details.requestingUrl);

    // 白名单：只放行可信来源的通知请求，其余一律拒绝。
    // 摄像头 / 麦克风（permission === 'media'）要看 details.mediaTypes 区分设备。
    const allowed = permission === 'notifications' && isAllowedOrigin(details.requestingUrl);
    callback(allowed);
  });

  // check handler：同步返回 boolean。webContents 可能为 null
  // （service worker 等非文档场景），此时按 requestingOrigin 判断。
  session.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    if (permission === 'notifications') {
      return requestingOrigin === TRUSTED_ORIGIN;
    }
    return false;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      // 保持官方默认：contextIsolation / sandbox 开，nodeIntegration 关
      preload: require('node:path').join(__dirname, 'preload.js'),
    },
  });

  // 安全策略已在 web-contents-created 统一挂载，这里只负责装内容。
  win.loadFile('index.html');
  return win;
}

app.whenReady().then(() => {
  // session.defaultSession 在 app ready 之后才可用（官方注记）
  setupPermissionHandlers(require('electron').session.defaultSession);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
