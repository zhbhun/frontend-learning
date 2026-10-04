/*
 * 演示 Service Worker v1：被演示页注册后，拦截演示 Worker 发起的 /sw-demo/*
 * 请求并返回本版本的预缓存响应。
 * 前置状态：无需额外环境；演示页通过 register() 注册本文件，默认 scope 是本
 *   文件所在目录（因此 Storybook 页面本身不受控，受控的是同目录的演示 Worker）。
 * 主要操作：install 预缓存演示资源；activate 清理旧版本缓存并 clients.claim()
 *   接管已有客户端；fetch 只拦截 /sw-demo/* 路径；收到 {type:'claim'} 消息时
 *   skipWaiting + claim；push / sync 事件广播给页面（DevTools 面板按钮可触发）。
 * 预期结果：演示请求读到 v1 的响应体；Application > Service Workers 面板显示
 *   本 worker 的状态、更新次数与全部调试开关。
 * 阅读主线：sw-v2.js 与本文件仅 VERSION 与响应体不同——浏览器靠逐字节对比发现
 *   "新版本"，本文件与 sw-v2.js 就是更新机制的最小样本。
 */

const VERSION = 'v1';
const CACHE_NAME = `sw-demo-cache-${VERSION}`;
const DEMO_QUOTE = {
  quote: '请求被 Service Worker 拦截，返回预缓存响应',
  from: `sw ${VERSION}`,
};

/** 向本 origin 的全部客户端（含未受控页面与 Worker）广播一条消息。 */
async function broadcast(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'all',
  });
  for (const client of clients) {
    client.postMessage(message);
  }
}

/* install：预缓存演示资源。waitUntil 让浏览器等待异步操作完成；Promise 拒绝
   就是安装失败，worker 直接丢弃（转 redundant）。 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(
        new Request('/sw-demo/api/quote.json'),
        new Response(JSON.stringify(DEMO_QUOTE), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      await broadcast({
        type: 'sw-event',
        name: 'install',
        version: VERSION,
        detail: `预缓存 ${CACHE_NAME}`,
      });
    })(),
  );
});

/* activate：删除旧版本缓存（避免撑爆配额），并 claim() 接管已存在的客户端——
   演示 Worker 是在注册之前创建的，不 claim 就要等下一次导航才受控。 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('sw-demo-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
      await broadcast({
        type: 'sw-event',
        name: 'activate',
        version: VERSION,
        detail: `已接管客户端，启用 ${CACHE_NAME}`,
      });
    })(),
  );
});

/* fetch：只拦截演示路径；其余请求不调用 respondWith，走默认网络流程。
   interceptCount 是全局变量——SW 被浏览器停止再重启后会归零。 */
let interceptCount = 0;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/sw-demo/')) {
    return;
  }
  interceptCount += 1;
  event.respondWith(
    (async () => {
      await broadcast({
        type: 'sw-intercepted',
        version: VERSION,
        count: interceptCount,
        url: url.pathname,
      });
      const cached = await caches.match(event.request, { cacheName: CACHE_NAME });
      return (
        cached ??
        new Response(JSON.stringify(DEMO_QUOTE), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    })(),
  );
});

/* 消息：页面发来 {type:'claim'} 时跳过等待并接管。对 waiting 中的新版本
   skipWaiting 生效；对已激活的 worker claim 生效——两个场景共用一条指令。 */
self.addEventListener('message', (event) => {
  if ((event.data || {}).type === 'claim') {
    self.skipWaiting();
    self.clients.claim();
  }
});

/* push / sync：Application > Service Workers 面板的 Push、Sync 按钮直接派发
   这两个事件，不需要真实推送服务或后台同步注册。 */
self.addEventListener('push', (event) => {
  broadcast({
    type: 'sw-event',
    name: 'push',
    version: VERSION,
    detail: event.data ? '带 payload' : '无 payload（面板 Push 按钮）',
  });
});

self.addEventListener('sync', (event) => {
  broadcast({
    type: 'sw-event',
    name: 'sync',
    version: VERSION,
    detail: `tag: ${event.tag}`,
  });
});
