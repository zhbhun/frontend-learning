/**
 * 范例：在沙箱页面（当前 Docs 页）动态注入 Plausible 跟踪脚本，观察 pageview 上报。
 * 输入：脚本文件（scriptFile，script.<ext>.js 变体）与站点域名（domain，即 data-domain）。
 * 操作：自动变体注入后立即上报一次 pageview；点击「触发 pageview」按钮调用
 *       window.plausible('pageview') 手动上报一次。
 * 预期结果：读数显示脚本加载状态、已上报 pageview 次数、最近一次上报的 URL 与域名；
 *           本地实例看板 http://localhost:8000/<domain> 的 realtime 读数同步出现访问。
 * 前置状态：本地 CE 实例运行中（http://localhost:8000），且已创建站点 test.local。
 * 阅读主线：createScriptSetup → injectScript（注入脚本）→ triggerPageview（按钮）
 *           → 拦截 fetch（提取发向 /api/event 的真实上报内容作为证据）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 本地 CE 实例地址；脚本与上报端点（/api/event）都指向它。 */
const PLAUSIBLE_ORIGIN = 'http://localhost:8000';

interface PlausibleOptions {
  url?: string;
  callback?: (result?: { status?: number; error?: unknown }) => void;
}

declare global {
  interface Window {
    /** 脚本加载后被替换为真正的 track 函数；加载前是下方注入的队列桩。 */
    plausible?: ((eventName: string, options?: PlausibleOptions) => void) & {
      q?: unknown[];
    };
  }
}

export interface ScriptSetupOptions {
  /** 注入的脚本变体文件名，如 script.local.js / script.manual.local.js。 */
  scriptFile: string;
  /** <script> 标签上的 data-domain，需与实例中创建的站点一致。 */
  domain: string;
}

export interface ScriptSetupSnapshot {
  scriptStatus: string;
  pageviewCount: number;
  lastUrl: string;
  lastDomain: string;
  lastResult: string;
}

export interface ScriptSetupInstance {
  update(options: ScriptSetupOptions): void;
  dispose(): void;
}

export function createScriptSetup(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScriptSetupSnapshot) => void,
): ScriptSetupInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ScriptSetupOptions = {
    scriptFile: 'script.local.js',
    domain: 'test.local',
  };

  let scriptEl: HTMLScriptElement | undefined;
  let scriptStatus = '尚未注入';
  let pageviewCount = 0;
  let lastUrl = '—';
  let lastDomain = '—';
  let lastResult = '—';
  let appliedKey: string | undefined;
  let reinjectTimer: number | undefined;

  // 拦截 window.fetch：tracker 通过 fetch POST /api/event 上报，
  // 在这里提取请求体中的 n（事件名）、u（URL）、d（域名）作为可核对证据。
  const originalFetch = window.fetch;
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url.includes('/api/event') && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body) as {
          n?: string;
          u?: string;
          d?: string;
        };
        if (payload.n === 'pageview') {
          pageviewCount += 1;
          lastUrl = payload.u ?? '—';
          lastDomain = payload.d ?? '—';
          sync();
        }
      } catch {
        // 非 JSON 请求体与本课无关，直接放行。
      }
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;

  function installQueueStub() {
    // 与官方内联片段相同的队列模式：脚本加载前把调用存入 plausible.q，
    // 脚本加载完成后自动补发，避免加载前点击按钮丢失调用。
    delete window.plausible;
    window.plausible = Object.assign(
      (...args: unknown[]) => {
        window.plausible!.q = window.plausible!.q || [];
        window.plausible!.q.push(args);
      },
      { q: [] as unknown[] },
    ) as Window['plausible'];
  }

  function injectScript(options: ScriptSetupOptions) {
    // 重新注入前重置证据，让每次切换都能从 0 开始观察。
    pageviewCount = 0;
    lastUrl = '—';
    lastDomain = '—';
    lastResult = '—';
    scriptStatus = '加载中…';

    scriptEl?.remove();
    installQueueStub();

    // 与正文标准片段等价的动态注入写法。
    const el = document.createElement('script');
    el.defer = true;
    el.setAttribute('data-domain', options.domain);
    el.src = `${PLAUSIBLE_ORIGIN}/js/${options.scriptFile}`;
    el.onload = () => {
      scriptStatus = '已加载';
      sync();
    };
    el.onerror = () => {
      scriptStatus = '加载失败：本地实例未运行？';
      lastResult = '无法上报：脚本来自实例，实例不可达时脚本也不可用';
      sync();
    };
    document.head.appendChild(el);
    scriptEl = el;
  }

  function triggerPageview() {
    if (scriptStatus.startsWith('加载失败') || !window.plausible) {
      lastResult = '脚本未加载，无法上报';
      sync();
      return;
    }
    if (scriptStatus !== '已加载') {
      // 调用进入队列桩，脚本加载完成后会自动补发。
      window.plausible('pageview');
      lastResult = '脚本加载中，调用已排队';
      sync();
      return;
    }
    window.plausible('pageview', {
      callback(result) {
        if (result?.status) {
          lastResult = `已上报（HTTP ${result.status}）`;
        } else if (result?.error) {
          lastResult = '上报失败：网络错误';
        } else {
          // 回调无参数说明 track 在发送前放弃了事件：
          // 本页地址是 localhost，不带 .local 的脚本会忽略 localhost 页面的事件。
          lastResult = '已忽略：localhost 页面需要带 .local 的脚本变体';
        }
        sync();
      },
    });
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '触发 pageview';
  button.style.cssText =
    'position:absolute;left:75%;top:66%;transform:translate(-50%,-50%);' +
    'padding:8px 18px;border:1px solid #4f7cff;border-radius:6px;' +
    'background:#4f7cff;color:#fff;cursor:pointer;z-index:1;' +
    'font:14px/1.4 ui-sans-serif,system-ui,sans-serif;';
  button.addEventListener('click', triggerPageview);
  canvas.parentElement?.appendChild(button);

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const midX = width / 2;

    // 左半：沙箱页面内注入的片段与加载状态。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('注入的片段', 36, 84);

    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `<script defer data-domain="${current.domain}"`,
      36,
      110,
      midX - 60,
    );
    drawingContext.fillText(
      `  src="${PLAUSIBLE_ORIGIN}/js/${current.scriptFile}">`,
      36,
      128,
      midX - 60,
    );
    drawingContext.fillText('</script>', 36, 146);

    const statusColor =
      scriptStatus === '已加载'
        ? '#15803d'
        : scriptStatus === '加载中…'
          ? '#b45309'
          : '#b91c1c';
    drawingContext.fillStyle = statusColor;
    drawingContext.beginPath();
    drawingContext.arc(42, 172, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(scriptStatus, 56, 177, midX - 80);

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      "右下按钮 = 调用 window.plausible('pageview')",
      36,
      216,
      midX - 60,
    );

    // 右半：事件去向与看板核对路径。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('事件去向', midX + 36, 84);

    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `POST ${PLAUSIBLE_ORIGIN}/api/event`,
      midX + 36,
      110,
      midX - 60,
    );
    drawingContext.fillText(
      `{ n: "pageview", u: <本页地址>, d: "${current.domain}" }`,
      midX + 36,
      128,
      midX - 60,
    );

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `看板核对：${PLAUSIBLE_ORIGIN}/${current.domain}`,
      midX + 36,
      170,
      midX - 60,
    );
    drawingContext.fillText(
      'realtime 实时访客读数同步 +1',
      midX + 36,
      190,
      midX - 60,
    );

    if (scriptStatus.startsWith('加载失败')) {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        '请先启动本地实例（见「本地实例」一课）',
        midX + 36,
        216,
        midX - 60,
      );
    }
  }

  // 外壳会丢弃距上次绘制不足 100ms 的读数推送，这里补一个尾随推送保证读数最终一致。
  let trailingTimer: number | undefined;
  function sync() {
    draw();
    emitSnapshot();
    window.clearTimeout(trailingTimer);
    trailingTimer = window.setTimeout(emitSnapshot, 150);
  }

  function emitSnapshot() {
    emit({ scriptStatus, pageviewCount, lastUrl, lastDomain, lastResult });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
      const key = `${options.scriptFile}|${options.domain}`;
      if (key === appliedKey) {
        return;
      }
      const firstInject = !appliedKey;
      appliedKey = key;
      // data-domain 逐键输入也会触发 update，防抖后一次性重新注入。
      window.clearTimeout(reinjectTimer);
      if (firstInject) {
        injectScript(options);
      } else {
        reinjectTimer = window.setTimeout(() => injectScript(options), 350);
      }
    },
    dispose() {
      window.clearTimeout(reinjectTimer);
      window.clearTimeout(trailingTimer);
      resizeObserver.disconnect();
      button.remove();
      scriptEl?.remove();
      delete window.plausible;
      window.fetch = originalFetch;
    },
  };
}
