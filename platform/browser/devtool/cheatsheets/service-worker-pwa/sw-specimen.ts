/**
 * 范例介绍：「Service Worker 操作台」——Controls 驱动一次真实的注册、更新、
 * 接管与注销；readout 显示注册状态、演示 Worker 的受控状态、请求结果与
 * Service Worker 广播的事件。
 * 前置状态：需在 http://localhost（安全上下文）打开；演示 SW 的 scope 只覆盖
 *   本课示例目录，受控客户端是同目录的演示 Worker，不是 Storybook 页面本身。
 * 主要操作：Controls「目标版本」触发 register / unregister / 更新注册；
 *   「立即接管」向 waiting 中的新版本发送 skipWaiting 指令；「发起演示请求」
 *   让演示 Worker fetch /sw-demo/api/quote.json——走不走 SW 由面板开关决定。
 * 预期结果：v1 注册后请求拿到 v1 响应体；更新为 v2 先 waiting、接管后激活且
 *   响应体变 v2；勾选 Bypass for network 或注销后请求 404（网络直连）。
 * 阅读主线：runTarget() 把「目标版本」翻译成 register / unregister；定时轮询
 *   getRegistration(scope) 组装「注册状态」行；SW 与 Worker 都是独立线程，
 *   一切状态变化都通过 postMessage 广播到本文件再刷进读数。
 */
import swV1Url from './sw-v1.js?url';
import swV2Url from './sw-v2.js?url';
import workerUrl from './sw-demo-worker.js?url';

/** 「目标版本」控件的取值。 */
export type SwTargetId = 'none' | 'v1' | 'v2';

export interface SwSpecimenOptions {
  target: SwTargetId;
  claim: boolean;
  request: boolean;
}

export interface SwSpecimenInstance {
  update(options: SwSpecimenOptions): void;
  dispose(): void;
}

/* ---------- 演示线程发来的消息 ---------- */

interface WorkerStatusMessage {
  type: 'worker-status';
  reason: string;
  controller: string | null;
}

interface FetchResultMessage {
  type: 'fetch-result';
  seq: number;
  ok: boolean;
  status: number;
  body: string;
}

interface SwEventMessage {
  type: 'sw-event';
  name: string;
  version: string;
  detail: string;
}

interface SwInterceptedMessage {
  type: 'sw-intercepted';
  version: string;
  count: number;
  url: string;
}

/* ---------- 工具 ---------- */

/** 把 ?url 导入的脚本地址规范化为同源绝对 URL（去掉可能附带的查询参数）。 */
function toAbsoluteHref(path: string): string {
  const url = new URL(path, window.location.href);
  url.search = '';
  return url.href;
}

function fileNameOf(href: string): string {
  try {
    return new URL(href).pathname.split('/').pop() || href;
  } catch {
    return href;
  }
}

function versionOf(scriptHref: string | null | undefined): string {
  if (!scriptHref) {
    return '?';
  }
  if (/sw-v2/.test(scriptHref)) {
    return 'v2';
  }
  if (/sw-v1/.test(scriptHref)) {
    return 'v1';
  }
  return '?';
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/* ---------- 脚本地址与 scope ---------- */

const SW_V1_HREF = toAbsoluteHref(swV1Url);
const SW_V2_HREF = toAbsoluteHref(swV2Url);
/** register 的默认 scope 是脚本所在目录；getRegistration 也按这个 scope 查询。 */
const SCOPE_HREF = new URL('./', SW_V1_HREF).href;

/* ---------- 标本样式 ---------- */

const SPECIMEN_STYLES = `
.sw-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.sw-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.sw-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.sw-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.sw-specimen__readout {
  flex: 1 1 260px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.sw-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.sw-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
  overflow-wrap: anywhere;
}
`;

/* ---------- 标本主体 ---------- */

export function createSwSpecimen(root: HTMLElement): SwSpecimenInstance {
  root.classList.add('sw-specimen');
  root.innerHTML = `
    <div class="sw-specimen__main">
      <p class="sw-specimen__hint">Service Worker 操作台：打开本页即在 http://localhost（安全上下文）注册真实的 <code>sw-v1.js</code>，scope 限定在本课示例目录——受控客户端是同目录的演示 Worker，不是本页面（见正文「作用域与受控」）。打开 DevTools 选 Application 面板，在 <code>Service Workers</code> 分栏对同一注册用开关、对照下方 readout。注册与缓存常驻本 origin，调试完把「目标版本」切到「未注册」即可注销。</p>
    </div>
    <dl class="sw-specimen__readout">
      <dt>注册状态</dt><dd class="sw-specimen__cell-status">查询中…</dd>
      <dt>Worker 受控</dt><dd class="sw-specimen__cell-controlled">—</dd>
      <dt>演示请求</dt><dd class="sw-specimen__cell-request">未发起</dd>
      <dt>SW 拦截计数</dt><dd class="sw-specimen__cell-intercept">—</dd>
      <dt>最近事件</dt><dd class="sw-specimen__cell-event">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const cells = {
    status: root.querySelector('.sw-specimen__cell-status') as HTMLElement,
    controlled: root.querySelector('.sw-specimen__cell-controlled') as HTMLElement,
    request: root.querySelector('.sw-specimen__cell-request') as HTMLElement,
    intercept: root.querySelector('.sw-specimen__cell-intercept') as HTMLElement,
    event: root.querySelector('.sw-specimen__cell-event') as HTMLElement,
  };

  let disposed = false;
  let claimEnabled = false;
  let lastTarget: SwTargetId | null = null;
  let lastRequest: boolean | null = null;
  let requestSequence = 0;
  let lastClaimSent: ServiceWorker | null = null;
  let lastAutoClaim: ServiceWorker | null = null;
  /** undefined = Worker 尚未汇报；null = 已汇报且未受控。 */
  let workerController: string | null | undefined = undefined;

  /* 演示 Worker：scope 内的受控客户端，请求经由它才会走 SW 的 fetch 事件。 */
  const worker = new Worker(workerUrl);
  worker.onmessage = (event: MessageEvent) => {
    const data = event.data as WorkerStatusMessage | FetchResultMessage | undefined;
    if (!data || disposed) {
      return;
    }
    if (data.type === 'worker-status') {
      workerController = data.controller;
      cells.controlled.textContent = data.controller
        ? `${fileNameOf(data.controller)}（${versionOf(data.controller)} 已接管 · ${data.reason}）`
        : `无（网络直连 · ${data.reason}）`;
      return;
    }
    if (data.type === 'fetch-result' && data.seq === requestSequence) {
      if (data.ok) {
        cells.request.textContent = `${data.status} ✓ SW 回应（缓存）· ${truncate(data.body, 72)}`;
      } else if (data.status > 0) {
        cells.request.textContent = `${data.status} ✗ 网络直连（未走 SW）`;
      } else {
        cells.request.textContent = `失败 ✗ ${truncate(data.body, 72)}`;
      }
    }
  };

  /* SW 广播：install / activate / push / sync 事件与拦截计数。 */
  function handleServiceWorkerMessage(event: MessageEvent): void {
    if (disposed) {
      return;
    }
    const data = event.data as SwEventMessage | SwInterceptedMessage | undefined;
    if (!data) {
      return;
    }
    if (data.type === 'sw-intercepted') {
      cells.intercept.textContent = `${data.count}（最近 ${data.url}，sw ${data.version}）`;
      return;
    }
    if (data.type === 'sw-event') {
      cells.event.textContent = `${data.name}（${data.version}）· ${data.detail} · ${clock()}`;
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }

  /* ---------- 注册状态的轮询与接管指令 ---------- */

  function paintRegistration(registration: ServiceWorkerRegistration | null): void {
    if (!registration) {
      cells.status.textContent = '无注册';
      return;
    }
    const parts: string[] = [];
    if (registration.installing) {
      const href = registration.installing.scriptURL;
      parts.push(`installing：${fileNameOf(href)}（${versionOf(href)}）`);
    }
    if (registration.waiting) {
      const href = registration.waiting.scriptURL;
      parts.push(`waiting：${fileNameOf(href)}（${versionOf(href)}）`);
    }
    if (registration.active) {
      const href = registration.active.scriptURL;
      parts.push(`active：${fileNameOf(href)}（${versionOf(href)} · ${registration.active.state}）`);
    }
    cells.status.textContent = parts.join(' ／ ') || '无 worker';
  }

  function maybeClaim(registration: ServiceWorkerRegistration | null): void {
    if (!registration) {
      return;
    }
    if (claimEnabled) {
      const candidate = registration.waiting ?? registration.installing;
      if (candidate && candidate !== lastClaimSent) {
        lastClaimSent = candidate;
        candidate.postMessage({ type: 'claim' });
        cells.event.textContent = `已向 waiting 版本发送 skipWaiting · ${clock()}`;
      }
    }
    /* 页面重挂后演示 Worker 不受控（claim 只在激活时自动执行一次）：
       向当前激活的 SW 补发接管指令。 */
    if (registration.active && workerController === null && lastAutoClaim !== registration.active) {
      lastAutoClaim = registration.active;
      registration.active.postMessage({ type: 'claim' });
    }
  }

  async function pollRegistration(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration(SCOPE_HREF);
      if (disposed) {
        return;
      }
      paintRegistration(registration ?? null);
      maybeClaim(registration ?? null);
    } catch {
      /* 非 HTTPS / localhost 等环境下不可用，读数保持现状。 */
    }
  }

  const pollTimer = window.setInterval(() => void pollRegistration(), 400);

  /* ---------- 目标版本驱动 ---------- */

  async function runTarget(target: SwTargetId): Promise<void> {
    try {
      if (target === 'none') {
        const registration = await navigator.serviceWorker.getRegistration(SCOPE_HREF);
        if (registration) {
          await registration.unregister();
          cells.event.textContent = `unregister() 完成，active worker 将转冗余 · ${clock()}`;
        } else {
          cells.event.textContent = `该 scope 没有注册 · ${clock()}`;
        }
        return;
      }
      const scriptHref = target === 'v2' ? SW_V2_HREF : SW_V1_HREF;
      const registration = await navigator.serviceWorker.register(scriptHref);
      cells.event.textContent = `register(${fileNameOf(scriptHref)}) → scope ${new URL(registration.scope).pathname} · ${clock()}`;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'Error';
      const message = (error as Error | null)?.message ?? String(error);
      cells.event.textContent = `${name}：${truncate(message, 96)}`;
    }
  }

  function issueRequest(): void {
    requestSequence += 1;
    cells.request.textContent = '请求中…';
    worker.postMessage({
      type: 'fetch',
      url: '/sw-demo/api/quote.json',
      seq: requestSequence,
    });
  }

  return {
    update(options) {
      claimEnabled = options.claim;
      if (options.target !== lastTarget) {
        lastTarget = options.target;
        void runTarget(options.target);
      }
      if (options.request !== lastRequest) {
        lastRequest = options.request;
        if (options.request) {
          issueRequest();
        } else {
          requestSequence += 1;
          cells.request.textContent = '未发起';
        }
      }
    },
    dispose() {
      disposed = true;
      window.clearInterval(pollTimer);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      worker.terminate();
    },
  };
}
