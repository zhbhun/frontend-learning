/*
 * 演示 Service Worker v2——「更新版本」的样本：与 sw-v1.js 仅 VERSION、响应体
 * 两处不同，浏览器靠这次字节差异判定"发现新版本"。
 * 前置状态：演示页在 v1 已激活时把它作为更新注册（register 同一 scope 下的
 *   新脚本 URL），或首次注册时直接以 v2 起步。
 * 主要操作：与 v1 相同——install 预缓存、activate 清旧缓存并 clients.claim()、
 *   fetch 拦截 /sw-demo/*、响应 claim 消息与 push / sync。
 * 预期结果：v1 仍控制客户端时本版本停在 waiting；skipWaiting / Update on
 *   reload 后激活，接管后的演示请求响应体换成 v2 文案，sw-demo-cache-v1 被删除。
 * 阅读主线：把本文件与 sw-v1.js 并排看——更新 = 新脚本字节不同 + 安装 + 等待
 *   （或跳过等待）+ 激活清理。
 */

const VERSION = 'v2';
const CACHE_NAME = `sw-demo-cache-${VERSION}`;
const DEMO_QUOTE = {
  quote: '新版本已接管，这行文案来自 sw v2',
  from: `sw ${VERSION}`,
  changelog: '与 v1 的字节差异：版本号与这份响应体',
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

/* install：预缓存 v2 的演示资源。 */
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

/* activate：v2 接管的第一件事就是删除 v1 的缓存——旧版本清理约定俗成放在
   activate 里做，避免新旧版本同时占配额。 */
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
        detail: `已接管客户端，清理旧缓存，启用 ${CACHE_NAME}`,
      });
    })(),
  );
});

/* fetch：拦截逻辑与 v1 相同，只是回应自己版本的缓存。 */
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

/* 消息与事件：与 v1 完全一致。 */
self.addEventListener('message', (event) => {
  if ((event.data || {}).type === 'claim') {
    self.skipWaiting();
    self.clients.claim();
  }
});

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
