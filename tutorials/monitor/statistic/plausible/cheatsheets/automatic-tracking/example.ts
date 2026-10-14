/**
 * 范例：注入带扩展的 Plausible 脚本，观察「不用写 JS」的自动追踪行为。
 * 输入：脚本变体（scriptFile）——默认纯 .local 对照组，可切换到扩展组合。
 * 操作：点击沙箱中的出站链接、文件下载链接、「模拟 404 页面」按钮、提交订阅表单。
 * 预期结果：扩展组合下，出站链接触发 Outbound Link: Click（p.url 为目标地址）、
 *           下载链接触发 File Download（p.url 为文件地址）、404 按钮触发 404 事件；
 *           表单提交在任何经典变体下都不触发事件（表单追踪只有站点设置开关 /
 *           init 的 formSubmissions 选项，没有经典脚本变体）；对照组下只有
 *           404 按钮（手动调用 window.plausible）会产生事件。
 * 前置状态：本地 CE 实例运行中（http://localhost:8000），站点 test.local 已创建；
 *           事件要在看板显示需先在站点设置注册同名 Goal（开关模式会自动注册）。
 * 阅读主线：createAutomaticTracking → applyVariant（注入或复用脚本）→ 控件操作
 *           → 拦截 fetch（提取 /api/event 载荷的 n/p/u 字段）
 *           → 无事件定时器给出「该行为未被追踪」的反向证据。
 * 注意：扩展变体在 document 上注册的点击监听无法随脚本元素摘除（tracker 设计如此），
 *       切回对照组后链接点击仍可能上报，重新加载本 Docs 页可完全复位。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 本地 CE 实例地址；脚本与上报端点（/api/event）都指向它。 */
const PLAUSIBLE_ORIGIN = 'http://localhost:8000';
/** 范例固定上报到的站点域名，即 <script> 标签上的 data-domain。 */
const DOMAIN = 'test.local';
/** 「模拟 404 页面」按钮手动上报的事件名，与官方 404 追踪片段一致。 */
const NOT_FOUND_EVENT = '404';
/** 操作后超过这个时间没有拦截到上报，就判定当前脚本不追踪该行为。 */
const NO_EVENT_TIMEOUT = 900;

interface PlausibleOptions {
  callback?: (result?: { status?: number; error?: unknown }) => void;
}

/** 脚本加载后 window.plausible 被替换为真正的 track 函数；加载前是队列桩。 */
type PlausibleFn = ((
  eventName: string,
  options?: PlausibleOptions,
) => void) & { q?: unknown[] };

/** 用局部类型断言访问 window.plausible，避免与其他课程的全局声明互相冲突。 */
const plausibleWindow = window as Window & { plausible?: PlausibleFn };

export interface AutomaticTrackingOptions {
  /** 注入的脚本变体文件名；扩展组合带 file-downloads 与 outbound-links。 */
  scriptFile: string;
}

export interface AutomaticTrackingSnapshot {
  scriptStatus: string;
  eventsSummary: string;
  lastEvent: string;
  lastPayload: string;
  lastResult: string;
}

export interface AutomaticTrackingInstance {
  update(options: AutomaticTrackingOptions): void;
  dispose(): void;
}

/** 每个脚本文件只注入一次，避免扩展重复注册 document 级监听。 */
interface LoadedVariant {
  el: HTMLScriptElement;
  /** 该变体加载完成时 window.plausible 的引用，切回时恢复。 */
  plausible?: PlausibleFn;
  status: 'loading' | 'loaded' | 'failed';
}

export function createAutomaticTracking(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AutomaticTrackingSnapshot) => void,
): AutomaticTrackingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: AutomaticTrackingOptions = { scriptFile: 'script.local.js' };

  const loadedVariants = new Map<string, LoadedVariant>();
  let scriptStatus = '尚未注入';
  const eventCounts = new Map<string, number>();
  let lastEvent = '—';
  let lastPayload = '—';
  let lastResult = '—';
  let appliedKey: string | undefined;
  let reinjectTimer: number | undefined;
  let noEventTimer: number | undefined;
  let eventsAtLastAction = 0;
  /** 扩展变体一旦加载过，document 级监听在当前页面会话内持续生效。 */
  let extensionLoaded = false;

  function hasExtensions() {
    return current.scriptFile.includes('outbound-links');
  }

  function totalEvents() {
    let total = 0;
    for (const count of eventCounts.values()) {
      total += count;
    }
    return total;
  }

  // 拦截 window.fetch：tracker 通过 fetch POST /api/event 上报，
  // 在这里提取请求体中的 n（事件名）、p（自定义属性）、u（页面地址）作为可核对证据。
  const originalFetch = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const isEventRequest = url.includes('/api/event');
    if (isEventRequest && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body) as {
          n?: string;
          u?: string;
          p?: Record<string, unknown>;
        };
        // 初始 pageview 与自动追踪无关，不计入证据。
        if (payload.n && payload.n !== 'pageview') {
          window.clearTimeout(noEventTimer);
          eventCounts.set(payload.n, (eventCounts.get(payload.n) ?? 0) + 1);
          lastEvent = payload.n;
          lastPayload = JSON.stringify({
            n: payload.n,
            ...(payload.p ? { p: payload.p } : {}),
            u: payload.u,
          });
          lastResult = '已发送，等待响应…';
          sync();
        }
      } catch {
        // 非 JSON 请求体与本课无关，直接放行。
      }
    }
    try {
      const response = await originalFetch(input, init);
      if (isEventRequest && lastResult === '已发送，等待响应…') {
        lastResult = `已发送（HTTP ${response.status}）`;
        sync();
      }
      return response;
    } catch (error) {
      if (isEventRequest && lastResult === '已发送，等待响应…') {
        lastResult = '上报失败：网络错误（本地实例未运行？）';
        sync();
      }
      throw error;
    }
  }) as typeof window.fetch;

  function installQueueStub() {
    // 与官方内联片段相同的队列模式：脚本加载前把调用存入 plausible.q，
    // 脚本加载完成后自动补发，避免加载前点击按钮丢失调用。
    plausibleWindow.plausible = Object.assign(
      (...args: unknown[]) => {
        const fn = plausibleWindow.plausible!;
        fn.q = fn.q || [];
        fn.q.push(args);
      },
      { q: [] as unknown[] },
    );
  }

  function applyVariant(options: AutomaticTrackingOptions) {
    // 切换变体时重置证据，让每次切换都能从 0 开始观察。
    eventCounts.clear();
    lastEvent = '—';
    lastPayload = '—';
    lastResult = '—';

    const cached = loadedVariants.get(options.scriptFile);
    if (cached?.status === 'loaded') {
      plausibleWindow.plausible = cached.plausible;
      scriptStatus = '已加载';
      sync();
      return;
    }
    cached?.el.remove();
    loadedVariants.delete(options.scriptFile);

    scriptStatus = '加载中…';
    installQueueStub();

    // 与正文片段等价的动态注入写法。
    const el = document.createElement('script');
    el.defer = true;
    el.setAttribute('data-domain', DOMAIN);
    el.src = `${PLAUSIBLE_ORIGIN}/js/${options.scriptFile}`;
    const record: LoadedVariant = { el, status: 'loading' };
    loadedVariants.set(options.scriptFile, record);
    el.onload = () => {
      record.status = 'loaded';
      record.plausible = plausibleWindow.plausible;
      if (options.scriptFile.includes('outbound-links')) {
        extensionLoaded = true;
      }
      scriptStatus = '已加载';
      sync();
    };
    el.onerror = () => {
      record.status = 'failed';
      scriptStatus = '加载失败：本地实例未运行？';
      lastResult = '无法上报：脚本来自实例，实例不可达时脚本也不可用';
      sync();
    };
    document.head.appendChild(el);
    sync();
  }

  /** 记录一次控件操作；若脚本不追踪该行为，定时器到点后给出反向证据。 */
  function recordAction(label: string) {
    window.clearTimeout(noEventTimer);
    eventsAtLastAction = totalEvents();
    lastResult = `${label}：观察中…`;
    sync();
    noEventTimer = window.setTimeout(() => {
      if (totalEvents() === eventsAtLastAction) {
        lastResult = `${label}：未产生上报（当前脚本不追踪该行为）`;
        sync();
      }
    }, NO_EVENT_TIMEOUT);
  }

  /** 404 按钮是手动调用，任何变体下都有效；用 callback 回报发送结果。 */
  function triggerNotFound() {
    recordAction('上报 404');
    if (scriptStatus.startsWith('加载失败') || !plausibleWindow.plausible) {
      lastResult = '脚本未加载，无法上报';
      sync();
      return;
    }
    plausibleWindow.plausible(NOT_FOUND_EVENT, {
      callback(result) {
        if (result?.status) {
          // 事件也可能已被 fetch 拦截记录，这里只补发送结果。
          lastResult = `已发送（HTTP ${result.status}）`;
        } else if (result?.error) {
          lastResult = '上报失败：网络错误';
        } else if (!result) {
          // 回调无参数说明 track 在发送前放弃了事件：
          // 本页地址是 localhost，不带 .local 的脚本会忽略 localhost 页面的事件。
          lastResult = '已忽略：localhost 页面需要带 .local 的脚本变体';
        }
        sync();
      },
    });
  }

  function place(element: HTMLElement, top: string) {
    element.style.cssText +=
      ';position:absolute;left:5%;top:' +
      top +
      ';transform:translateY(-50%);z-index:1;' +
      'font:13px/1.4 ui-sans-serif,system-ui,sans-serif;';
    canvas.parentElement?.appendChild(element);
  }

  // 四个沙箱元素：出站链接、文件下载链接、404 按钮、订阅表单。
  // 链接与表单都 preventDefault 避免 iframe 跳走；preventDefault 不阻止冒泡，
  // tracker 在 document 上的监听仍能收到点击与提交。
  const outboundLink = document.createElement('a');
  outboundLink.href = 'https://example.com';
  outboundLink.textContent = '访问 example.com ↗';
  outboundLink.style.cssText = 'color:#1d4ed8;text-decoration:underline;cursor:pointer;';
  outboundLink.addEventListener('click', (event) => {
    event.preventDefault();
    recordAction('点击出站链接');
  });
  place(outboundLink, '32%');

  const downloadLink = document.createElement('a');
  downloadLink.href = '/whitepaper.pdf';
  downloadLink.textContent = '下载白皮书 PDF';
  downloadLink.style.cssText = 'color:#1d4ed8;text-decoration:underline;cursor:pointer;';
  downloadLink.addEventListener('click', (event) => {
    event.preventDefault();
    recordAction('点击下载链接');
  });
  place(downloadLink, '42%');

  const notFoundButton = document.createElement('button');
  notFoundButton.type = 'button';
  notFoundButton.textContent = '模拟 404 页面';
  notFoundButton.style.cssText =
    'padding:6px 12px;border:1px solid #4f7cff;border-radius:6px;' +
    'background:#4f7cff;color:#fff;cursor:pointer;';
  notFoundButton.addEventListener('click', triggerNotFound);
  place(notFoundButton, '52%');

  const demoForm = document.createElement('form');
  demoForm.style.cssText = 'display:flex;gap:8px;align-items:center;';
  const emailInput = document.createElement('input');
  emailInput.placeholder = '邮箱';
  emailInput.style.cssText =
    'width:110px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;' +
    'font:13px/1.4 ui-sans-serif,system-ui,sans-serif;';
  const subscribeButton = document.createElement('button');
  subscribeButton.type = 'submit';
  subscribeButton.textContent = '订阅';
  subscribeButton.style.cssText =
    'padding:6px 12px;border:1px solid #64748b;border-radius:6px;' +
    'background:#fff;color:#334155;cursor:pointer;';
  demoForm.append(emailInput, subscribeButton);
  demoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    recordAction('提交表单');
  });
  place(demoForm, '64%');

  function summarizeEvents() {
    if (eventCounts.size === 0) {
      return '（尚未触发）';
    }
    return Array.from(eventCounts.entries())
      .map(([name, count]) => `${name} × ${count}`)
      .join(' · ');
  }

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
    const extended = hasExtensions();

    // 左半：沙箱页面内的四个元素与脚本状态。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('沙箱页面的四个元素', 36, 52);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('点击链接与按钮、提交表单，观察下方读数', 36, 70);

    const statusColor =
      scriptStatus === '已加载'
        ? '#15803d'
        : scriptStatus === '加载中…'
          ? '#b45309'
          : '#b91c1c';
    drawingContext.fillStyle = statusColor;
    drawingContext.beginPath();
    drawingContext.arc(42, 86, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `${current.scriptFile}：${scriptStatus}`,
      54,
      90,
      midX - 70,
    );

    // 右半：当前脚本下四种行为分别会产生什么。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('当前脚本会捕获什么', midX + 36, 52);

    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const behaviors: Array<[string, string]> = extended
      ? [
          ['出站链接', 'Outbound Link: Click（p.url）'],
          ['下载链接', 'File Download（p.url）'],
          ['404 按钮', "404（手动调用 plausible('404')）"],
          ['提交表单', '（无事件：经典变体无表单扩展）'],
        ]
      : [
          ['出站链接', '（无事件）'],
          ['下载链接', '（无事件）'],
          ['404 按钮', "404（手动调用 plausible('404')）"],
          ['提交表单', '（无事件）'],
        ];
    behaviors.forEach(([action, outcome], index) => {
      const y = 84 + index * 20;
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(`${action} →`, midX + 36, y);
      drawingContext.fillStyle = outcome.startsWith('（') ? '#94a3b8' : '#172033';
      drawingContext.fillText(outcome, midX + 116, y, midX - 160);
    });

    drawingContext.fillStyle = '#475569';
    drawingContext.fillText(`POST ${PLAUSIBLE_ORIGIN}/api/event`, midX + 36, 176);
    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `核对：${PLAUSIBLE_ORIGIN}/${DOMAIN}/settings/goals 注册同名 Goal，`,
      midX + 36,
      200,
      midX - 60,
    );
    drawingContext.fillText(
      '看板 Goals 区块出现转化记录',
      midX + 36,
      218,
      midX - 60,
    );

    if (scriptStatus.startsWith('加载失败')) {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        '请先启动本地实例（见「本地实例」一课）',
        midX + 36,
        244,
        midX - 60,
      );
    } else if (extensionLoaded && !extended) {
      drawingContext.fillStyle = '#b45309';
      drawingContext.fillText(
        '扩展监听已装入本页，链接点击仍可能上报；',
        midX + 36,
        244,
        midX - 60,
      );
      drawingContext.fillText(
        '重新加载本页可完全复位',
        midX + 36,
        262,
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
    emit({
      scriptStatus,
      eventsSummary: summarizeEvents(),
      lastEvent,
      lastPayload,
      lastResult,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
      const key = options.scriptFile;
      if (key === appliedKey) {
        return;
      }
      const firstApply = !appliedKey;
      appliedKey = key;
      window.clearTimeout(reinjectTimer);
      if (firstApply) {
        applyVariant(options);
      } else {
        reinjectTimer = window.setTimeout(() => applyVariant(options), 350);
      }
    },
    dispose() {
      window.clearTimeout(reinjectTimer);
      window.clearTimeout(noEventTimer);
      window.clearTimeout(trailingTimer);
      resizeObserver.disconnect();
      // 扩展注册的 document 级监听无法随脚本元素移除（tracker 设计如此），
      // 只能移除本课控件，保证离开后控件本身不再可点。
      for (const element of [
        outboundLink,
        downloadLink,
        notFoundButton,
        demoForm,
      ]) {
        element.remove();
      }
      for (const record of loadedVariants.values()) {
        record.el.remove();
      }
      loadedVariants.clear();
      delete plausibleWindow.plausible;
      window.fetch = originalFetch;
    },
  };
}
