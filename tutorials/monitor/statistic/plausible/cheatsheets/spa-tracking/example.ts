/**
 * 范例：在沙箱页面（当前 Docs 页）模拟一个微型 SPA，对比三种脚本模式下 pageview 的采集行为。
 * 输入：脚本模式（scriptFile：script.local.js 自动 / script.hash.local.js hash / script.manual.local.js 手动）。
 * 操作：「pushState 导航」真实调用 history.pushState 切换路径（/products/1 → /products/2 → /cart 循环）；
 *       「hash 导航」真实改写 location.hash（#/cart → #/about → #/checkout 循环）；
 *       「手动上报 pageview」调用 window.plausible('pageview')。
 * 预期结果：自动模式只在 pushState 导航时上报（hash 导航不上报）；hash 模式只在 hash 导航时
 *           上报（pushState 导航不上报）；手动模式两种导航都不报、只认手动上报。
 *           拦截 fetch 提取发向 /api/event 的真实载荷（n/u 字段）作为证据。
 * 前置状态：本地 CE 实例运行中（http://localhost:8000），且已创建站点 test.local。
 * 沙箱副作用：自动/hash 变体一旦加载，它们装入的挂钩（pushState 包装、hashchange 监听）没有卸载
 *           入口，dispose 也无法摘除，切换模式后仍会上报——读数「本页已装入挂钩」持续标出该状态，
 *           重载页面即可复位。这与真实世界「自动脚本仍在加载导致双计数」是同一机制。
 * 阅读主线：createSpaTracking → applyVariant（注入或复用脚本）→ 三个按钮
 *           → 拦截 fetch（提取真实上报内容）与 callback（发送结果）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 本地 CE 实例地址；脚本与上报端点（/api/event）都指向它。 */
const PLAUSIBLE_ORIGIN = 'http://localhost:8000';
/** 范例固定上报到的站点域名，即 <script> 标签上的 data-domain。 */
const DOMAIN = 'test.local';

/** pushState 导航循环使用的虚拟路由（只改路径）。 */
const PUSH_STATE_ROUTES = ['/products/1', '/products/2', '/cart'];
/** hash 导航循环使用的虚拟路由（只改 hash）。 */
const HASH_ROUTES = ['#/cart', '#/about', '#/checkout'];

interface PlausibleOptions {
  /** 覆盖上报的页面地址；u 与 url 等价，同时给出时 u 优先（见 tracker 源码 track.js）。 */
  u?: string;
  url?: string;
  callback?: (result?: { status?: number; error?: unknown }) => void;
}

/** 脚本加载后 window.plausible 被替换为真正的 track 函数；加载前是下方注入的队列桩。 */
type PlausibleFn = ((
  eventName: string,
  options?: PlausibleOptions,
) => void) & { q?: unknown[] };

/** 用局部类型断言访问 window.plausible，避免与其他课程的全局声明互相冲突。 */
const plausibleWindow = window as Window & { plausible?: PlausibleFn };

/**
 * 每种脚本模式装入的挂钩与期望行为。事实来源是编译产物本身：
 * 自动变体包装 history.pushState 并监听 popstate（不碰 replaceState，同路径导航去重）；
 * hash 变体只监听 hashchange（不去重）；manual 变体不装任何挂钩。
 */
const MODES: Record<
  string,
  { hook: string | null; expect: [string, string] }
> = {
  'script.local.js': {
    hook: 'pushState + popstate',
    expect: [
      '挂钩 pushState + popstate：路径导航自动上报',
      'hash 导航不上报；同路径导航被去重',
    ],
  },
  'script.hash.local.js': {
    hook: 'hashchange',
    expect: [
      '只听 hashchange：hash 导航自动上报',
      'pushState 导航不上报；每次 hash 变化都计数',
    ],
  },
  'script.manual.local.js': {
    hook: null,
    expect: [
      '不装任何挂钩：两种导航都不上报',
      "只认 window.plausible('pageview') 手动上报",
    ],
  },
};

/**
 * 本页会话内已装入的挂钩计数。挂钩没有卸载入口，且离开本课 Docs 页时 Storybook
 * 不重载 iframe 文档，因此必须放在模块级：实例销毁重建后读数仍然准确。
 * 重载页面后脚本重新执行，计数随之归零。
 */
const armedHookCounts = new Map<string, number>();

export interface SpaTrackingOptions {
  /** 注入的脚本变体文件名，决定采集模式。 */
  scriptFile: string;
}

export interface SpaTrackingSnapshot {
  scriptStatus: string;
  route: string;
  pageviewCount: number;
  lastPayload: string;
  armedHooks: string;
}

export interface SpaTrackingInstance {
  update(options: SpaTrackingOptions): void;
  dispose(): void;
}

/** 每个脚本文件只注入一次，避免同一变体重复装入挂钩。 */
interface LoadedVariant {
  el: HTMLScriptElement;
  /** 该变体加载完成时 window.plausible 的引用，切回时恢复。 */
  plausible?: PlausibleFn;
  status: 'loading' | 'loaded' | 'failed';
}

export function createSpaTracking(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SpaTrackingSnapshot) => void,
): SpaTrackingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SpaTrackingOptions = { scriptFile: 'script.local.js' };

  const loadedVariants = new Map<string, LoadedVariant>();
  let scriptStatus = '尚未注入';
  let pageviewCount = 0;
  let lastPayload = '—';
  let lastResult = '—';
  let pushStateIndex = 0;
  let hashIndex = 0;
  let appliedKey: string | undefined;
  let reinjectTimer: number | undefined;
  /** 进入范例时的原始地址，dispose 时用它复位。 */
  const originalHref = location.href;

  /** 当前虚拟路由：路径 + hash（query 与路由无关，不展示）。 */
  function currentRoute() {
    return location.pathname + location.hash;
  }

  function armedHooksText() {
    if (armedHookCounts.size === 0) {
      return '无';
    }
    return Array.from(armedHookCounts.entries())
      .map(([hook, count]) => (count > 1 ? `${hook} ×${count}` : hook))
      .join('；');
  }

  // 拦截 window.fetch：tracker 通过 fetch POST /api/event 上报，
  // 在这里提取请求体中的 n（事件名）、u（URL）作为可核对证据。
  // u 字段是完整 URL，读数只保留路径与 hash，便于与虚拟路由逐字符对照。
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
        const payload = JSON.parse(init.body) as { n?: string; u?: string };
        if (payload.n === 'pageview') {
          pageviewCount += 1;
          let shortUrl = payload.u ?? '—';
          try {
            const parsed = new URL(shortUrl);
            shortUrl = parsed.pathname + parsed.hash;
          } catch {
            // 无法解析时原样展示。
          }
          lastPayload = `n=pageview · u=${shortUrl}`;
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
    plausibleWindow.plausible = Object.assign(
      (...args: unknown[]) => {
        const fn = plausibleWindow.plausible!;
        fn.q = fn.q || [];
        fn.q.push(args);
      },
      { q: [] as unknown[] },
    );
  }

  function applyVariant(options: SpaTrackingOptions) {
    // 切换模式时重置证据，让「同一导航动作在三种模式下」的对比从 0 开始。
    pageviewCount = 0;
    lastPayload = '—';
    lastResult = '—';

    const cached = loadedVariants.get(options.scriptFile);
    if (cached?.status === 'loaded') {
      // 复用已加载的变体：恢复它自己的 window.plausible，不重复注入（不重复装挂钩）。
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
      scriptStatus = '已加载';
      // 该变体装入的挂钩从此刻起持续生效，且不随模式切换或 dispose 移除。
      const hook = MODES[options.scriptFile]?.hook;
      if (hook) {
        armedHookCounts.set(hook, (armedHookCounts.get(hook) ?? 0) + 1);
      }
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

  function navigatePushState() {
    const route =
      PUSH_STATE_ROUTES[pushStateIndex % PUSH_STATE_ROUTES.length];
    pushStateIndex += 1;
    // 保留当前 hash：pushState 只改路径。若顺带改掉 hash 会额外触发 hashchange，
    // 干扰「pushState 导航在 hash 模式下不上报」的对比证据。
    history.pushState({ spaDemo: route }, '', route + location.hash);
    sync();
  }

  function navigateHash() {
    const route = HASH_ROUTES[hashIndex % HASH_ROUTES.length];
    hashIndex += 1;
    // hash 变化异步触发 hashchange，hash 变体在事件回调里上报，读数随即更新。
    location.hash = route;
    sync();
  }

  function reportManually() {
    if (scriptStatus.startsWith('加载失败') || !plausibleWindow.plausible) {
      lastResult = '脚本未加载，无法上报';
      sync();
      return;
    }
    if (scriptStatus !== '已加载') {
      // 调用进入队列桩，脚本加载完成后会自动补发。
      plausibleWindow.plausible('pageview');
      lastResult = '脚本加载中，调用已排队';
      sync();
      return;
    }
    plausibleWindow.plausible('pageview', {
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

  function makeButton(label: string, left: string) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText =
      `position:absolute;left:${left};top:60%;transform:translate(-50%,-50%);` +
      'padding:8px 14px;border:1px solid #4f7cff;border-radius:6px;' +
      'background:#4f7cff;color:#fff;cursor:pointer;z-index:1;' +
      'font:14px/1.4 ui-sans-serif,system-ui,sans-serif;';
    canvas.parentElement?.appendChild(button);
    return button;
  }

  const pushStateButton = makeButton('pushState 导航', '15%');
  const hashButton = makeButton('hash 导航', '36%');
  const manualButton = makeButton('手动上报 pageview', '62%');

  pushStateButton.addEventListener('click', navigatePushState);
  hashButton.addEventListener('click', navigateHash);
  manualButton.addEventListener('click', reportManually);

  // 浏览器前进/后退（popstate）与外部 hash 变化时同步虚拟路由读数。
  function handleRouteChange() {
    sync();
  }
  window.addEventListener('popstate', handleRouteChange);
  window.addEventListener('hashchange', handleRouteChange);

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
    const mode = MODES[current.scriptFile] ?? MODES['script.local.js'];

    // 左半：虚拟 SPA 的当前路由与下一次导航预览。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('虚拟 SPA：本页地址即路由', 36, 84);

    drawingContext.fillStyle = '#4f7cff';
    drawingContext.font =
      '600 17px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(currentRoute(), 36, 114, midX - 60);

    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `下一次 pushState → ${PUSH_STATE_ROUTES[pushStateIndex % PUSH_STATE_ROUTES.length]}`,
      36,
      142,
      midX - 60,
    );
    drawingContext.fillText(
      `下一次 hash → ${HASH_ROUTES[hashIndex % HASH_ROUTES.length]}`,
      36,
      160,
      midX - 60,
    );

    const statusColor =
      scriptStatus === '已加载'
        ? '#15803d'
        : scriptStatus === '加载中…'
          ? '#b45309'
          : '#b91c1c';
    drawingContext.fillStyle = statusColor;
    drawingContext.beginPath();
    drawingContext.arc(42, 188, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `${current.scriptFile}：${scriptStatus}`,
      56,
      193,
      midX - 80,
    );

    if (scriptStatus.startsWith('加载失败')) {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        '请先启动本地实例（见「本地实例」一课）',
        36,
        222,
        midX - 60,
      );
    }

    // 右半：当前模式的期望行为与上报去向。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('当前模式的期望行为', midX + 36, 84);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(mode.expect[0], midX + 36, 110, midX - 60);
    drawingContext.fillText(mode.expect[1], midX + 36, 128, midX - 60);

    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      `POST ${PLAUSIBLE_ORIGIN}/api/event`,
      midX + 36,
      154,
      midX - 60,
    );
    drawingContext.fillText(
      `{ n: "pageview", u: <当前地址>, d: "${DOMAIN}" }`,
      midX + 36,
      172,
      midX - 60,
    );

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `手动上报：${lastResult}`,
      midX + 36,
      200,
      midX - 60,
    );

    const armed = armedHooksText();
    drawingContext.fillStyle = armed === '无' ? '#5d6f67' : '#b45309';
    drawingContext.fillText(
      armed === '无'
        ? '本页已装入挂钩：无'
        : `本页已装入挂钩：${armed}（重载页面复位）`,
      midX + 36,
      224,
      midX - 60,
    );

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.fillText(
      `看板核对：${PLAUSIBLE_ORIGIN}/${DOMAIN} realtime +1`,
      midX + 36,
      248,
      midX - 60,
    );
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
      route: currentRoute(),
      pageviewCount,
      lastPayload,
      armedHooks: armedHooksText(),
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
      window.clearTimeout(trailingTimer);
      resizeObserver.disconnect();
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
      pushStateButton.remove();
      hashButton.remove();
      manualButton.remove();
      for (const record of loadedVariants.values()) {
        record.el.remove();
      }
      loadedVariants.clear();
      delete plausibleWindow.plausible;
      window.fetch = originalFetch;
      // tracker 只包装 history.pushState、从不碰 replaceState（见正文「自动采集」），
      // 因此用 replaceState 复位地址不会触发任何上报。
      history.replaceState(null, '', originalHref);
      // 已装入的挂钩（pushState 包装、hashchange 监听）没有卸载入口，随本页会话
      // 存续；模块级 armedHookCounts 继续如实显示，重载页面后归零。
    },
  };
}
