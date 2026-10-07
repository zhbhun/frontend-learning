/**
 * webRequest 拦截参考实现：onBeforeRequest 的过滤、取消与重定向。
 *
 * 前置状态：依赖 Electron 运行时与同目录的 index.html。
 * 运行方式：放进 Forge 项目的 src/ 替换 index.js，npm start 观察终端日志。
 *
 * 预期结果：终端持续打印放行请求的地址与 resourceType；命中拦截规则的
 * 请求被 cancel，页面里对应资源不加载（把 urls 换成真实广告域名即可看到
 * 页面少加载内容）。
 *
 * 阅读主线：注册时机（窗口加载前）→ filter 限定范围 → callback 必须调用
 * → 每个事件只有最后一个监听器生效。
 */
const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

const AD_PATTERN = '*://ads.example.com/*';

app.whenReady().then(() => {
  const ses = session.defaultSession;

  // 拦截请求：filter 的 urls 是 URL 匹配模式数组（也支持 '<all_urls>'），
  // 省略 filter 则匹配所有请求
  ses.webRequest.onBeforeRequest(
    { urls: [AD_PATTERN] },
    (details, callback) => {
      console.log('拦截：', details.url, `(${details.resourceType})`);
      // callback 必须调用：cancel 取消请求；redirectURL 把请求改道
      callback({ cancel: true });
    },
  );

  // 观察用：换一个事件统计放行的请求头（同一事件再注册一次会把上面
  // 的监听器顶掉——每个事件只有最后附加的监听器生效）
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    console.log('发出请求：', details.url, `(${details.resourceType})`);
    callback({ requestHeaders: details.requestHeaders });
  });

  // 注册要赶在窗口发起请求之前：先挂监听，再创建窗口加载页面
  const mainWindow = new BrowserWindow({ width: 800, height: 560 });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
});
