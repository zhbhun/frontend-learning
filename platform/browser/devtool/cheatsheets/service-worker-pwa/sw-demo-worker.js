/*
 * 演示 Worker（专用 Worker，classic worker）：本文件的 URL 位于演示 Service
 * Worker 的 scope 内，因此它是 SW 的受控客户端——它发起的 fetch 会被 SW 的
 * fetch 事件拦截；而 Storybook 页面本身在 scope 之外，不受控制。
 * 这就是演示页能真实验证「缓存命中 / Bypass for network / Offline」的关键。
 * 主要操作：加载与 controller 变化时向父页面汇报受控状态；收到 {type:'fetch'}
 * 时以 no-store 发起一次请求并把结果发回父页面（SW 广播的事件也到这里，
 * 但只处理演示请求）。
 * 预期结果：SW 激活后 controller 从 null 变为 sw-v*.js；请求结果在 200（SW
 * 回应）与 404（Bypass 或未注册时的网络直连）之间随面板开关变化。
 */

function reportController(reason) {
  const container = self.navigator.serviceWorker;
  const controller = container ? container.controller : null;
  self.postMessage({
    type: 'worker-status',
    reason,
    controller: controller ? controller.scriptURL : null,
  });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'fetch') {
    return;
  }
  /* no-store：绕开 HTTP 缓存，让结果只反映「SW 回应还是网络直连」。 */
  fetch(data.url, { cache: 'no-store' })
    .then(async (response) => {
      const body = await response.text();
      self.postMessage({
        type: 'fetch-result',
        seq: data.seq ?? 0,
        ok: response.ok,
        status: response.status,
        body: body.slice(0, 160),
      });
    })
    .catch((error) => {
      self.postMessage({
        type: 'fetch-result',
        seq: data.seq ?? 0,
        ok: false,
        status: 0,
        body: String(error).slice(0, 160),
      });
    });
});

if (self.navigator.serviceWorker) {
  reportController('load');
  self.navigator.serviceWorker.addEventListener('controllerchange', () => {
    reportController('controllerchange');
  });
}
