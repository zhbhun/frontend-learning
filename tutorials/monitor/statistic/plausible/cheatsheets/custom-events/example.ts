/**
 * 范例：在沙箱页面（当前 Docs 页）动态注入 Plausible 脚本，用两种方式上报自定义事件。
 * 输入：脚本变体（scriptFile）与「购买」按钮触发的事件名（purchaseEvent）。
 * 操作：点击「报名」「购买」按钮——manual 变体由按钮调用 window.plausible('<事件名>')，
 *       tagged-events 变体不写 JS，靠按钮上的 plausible-event-name=<事件名> 类自动捕获点击。
 * 预期结果：读数显示脚本状态、每种事件已触发的次数、最近一次上报的载荷与发送结果；
 *           事件先进入本地实例，在站点设置中把同名 Custom event 添加为 Goal 后，
 *           看板 http://localhost:8000/test.local 底部的 Goals 区块出现转化记录。
 * 前置状态：本地 CE 实例运行中（http://localhost:8000），且已创建站点 test.local。
 * 阅读主线：createCustomEvents → applyVariant（注入或复用脚本、切换按钮形态）
 *           → 按钮点击（manual 走 triggerEvent，tagged 由脚本自动捕获）
 *           → 拦截 fetch（提取发向 /api/event 的真实载荷）与 callback（发送结果）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 本地 CE 实例地址；脚本与上报端点（/api/event）都指向它。 */
const PLAUSIBLE_ORIGIN = 'http://localhost:8000';
/** 范例固定上报到的站点域名，即 <script> 标签上的 data-domain。 */
const DOMAIN = 'test.local';
/** 「报名」按钮固定触发的事件名；「购买」按钮的事件名由读者输入。 */
const SIGNUP_EVENT = 'Signup';

interface PlausibleOptions {
  callback?: (result?: { status?: number; error?: unknown }) => void;
}

/** 脚本加载后 window.plausible 被替换为真正的 track 函数；加载前是下方注入的队列桩。 */
type PlausibleFn = ((
  eventName: string,
  options?: PlausibleOptions,
) => void) & { q?: unknown[] };

/** 用局部类型断言访问 window.plausible，避免与其他课程的全局声明互相冲突。 */
const plausibleWindow = window as Window & { plausible?: PlausibleFn };

export interface CustomEventsOptions {
  /** 注入的脚本变体文件名；tagged-events 变体让按钮改走 class 标注。 */
  scriptFile: string;
  /** 「购买」按钮触发的事件名，需与实例中添加的 Goal 名逐字符一致。 */
  purchaseEvent: string;
}

export interface CustomEventsSnapshot {
  scriptStatus: string;
  eventsSummary: string;
  lastEvent: string;
  lastPayload: string;
  lastResult: string;
}

export interface CustomEventsInstance {
  update(options: CustomEventsOptions): void;
  dispose(): void;
}

/** 每个脚本文件只注入一次，避免 tagged-events 变体重复注册 document 级点击监听。 */
interface LoadedVariant {
  el: HTMLScriptElement;
  /** 该变体加载完成时 window.plausible 的引用，切回时恢复。 */
  plausible?: PlausibleFn;
  status: 'loading' | 'loaded' | 'failed';
}

export function createCustomEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CustomEventsSnapshot) => void,
): CustomEventsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CustomEventsOptions = {
    scriptFile: 'script.manual.local.js',
    purchaseEvent: 'Purchase',
  };

  const loadedVariants = new Map<string, LoadedVariant>();
  let scriptStatus = '尚未注入';
  const eventCounts = new Map<string, number>();
  let lastEvent = '—';
  let lastPayload = '—';
  let lastResult = '—';
  let appliedKey: string | undefined;
  let reinjectTimer: number | undefined;

  function isTaggedMode() {
    return current.scriptFile.includes('tagged-events');
  }

  function purchaseEventName() {
    const name = current.purchaseEvent.trim();
    return name || 'Purchase';
  }

  // 拦截 window.fetch：tracker 通过 fetch POST /api/event 上报，
  // 在这里提取请求体中的 n（事件名）、u（URL）、d（域名）作为可核对证据；
  // tagged 模式没有 callback，改用响应状态作为发送结果。
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
          d?: string;
        };
        if (payload.n && payload.n !== 'pageview') {
          const name = payload.n;
          eventCounts.set(name, (eventCounts.get(name) ?? 0) + 1);
          lastEvent = name;
          lastPayload = JSON.stringify({
            n: payload.n,
            d: payload.d,
            u: payload.u,
          });
          if (isTaggedMode()) {
            lastResult = '已发送，等待响应…';
          }
          sync();
        }
      } catch {
        // 非 JSON 请求体与本课无关，直接放行。
      }
    }
    try {
      const response = await originalFetch(input, init);
      if (isEventRequest && isTaggedMode()) {
        lastResult = `已发送（HTTP ${response.status}）`;
        sync();
      }
      return response;
    } catch (error) {
      if (isEventRequest && isTaggedMode()) {
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

  function applyVariant(options: CustomEventsOptions) {
    // 切换变体时重置证据，让每次切换都能从 0 开始观察。
    eventCounts.clear();
    lastEvent = '—';
    lastPayload = '—';
    lastResult = '—';

    const cached = loadedVariants.get(options.scriptFile);
    if (cached?.status === 'loaded') {
      // 复用已加载的变体：恢复它自己的 window.plausible，不重复注入。
      plausibleWindow.plausible = cached.plausible;
      scriptStatus = '已加载';
      syncButtons();
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
      sync();
    };
    el.onerror = () => {
      record.status = 'failed';
      scriptStatus = '加载失败：本地实例未运行？';
      lastResult = '无法上报：脚本来自实例，实例不可达时脚本也不可用';
      sync();
    };
    document.head.appendChild(el);
    syncButtons();
    sync();
  }

  function triggerEvent(eventName: string) {
    if (scriptStatus.startsWith('加载失败') || !plausibleWindow.plausible) {
      lastResult = '脚本未加载，无法上报';
      sync();
      return;
    }
    if (scriptStatus !== '已加载') {
      // 调用进入队列桩，脚本加载完成后会自动补发。
      plausibleWindow.plausible(eventName);
      lastResult = '脚本加载中，调用已排队';
      sync();
      return;
    }
    plausibleWindow.plausible(eventName, {
      callback(result) {
        if (result?.status) {
          lastResult = `已发送（HTTP ${result.status}）`;
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
      'padding:8px 16px;border:1px solid #4f7cff;border-radius:6px;' +
      'background:#4f7cff;color:#fff;cursor:pointer;z-index:1;' +
      'font:14px/1.4 ui-sans-serif,system-ui,sans-serif;';
    canvas.parentElement?.appendChild(button);
    return button;
  }

  const signupButton = makeButton('报名', '13%');
  const purchaseButton = makeButton('购买', '33%');

  signupButton.addEventListener('click', () => {
    if (!isTaggedMode()) {
      triggerEvent(SIGNUP_EVENT);
    }
  });
  purchaseButton.addEventListener('click', () => {
    if (!isTaggedMode()) {
      triggerEvent(purchaseEventName());
    }
  });

  function syncButtons() {
    // tagged 模式不写 JS：把事件名标在按钮的 class 上，空格按规则换成 +，
    // 由 tagged-events 变体的 document 级点击监听自动捕获。
    for (const [button, name] of [
      [signupButton, SIGNUP_EVENT],
      [purchaseButton, purchaseEventName()],
    ] as const) {
      for (const cls of Array.from(button.classList)) {
        if (cls.startsWith('plausible-event-name')) {
          button.classList.remove(cls);
        }
      }
      if (isTaggedMode()) {
        button.classList.add(`plausible-event-name=${name.replace(/ /g, '+')}`);
      }
    }
  }

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
    const tagged = isTaggedMode();

    // 左半：沙箱页面内两个业务按钮与当前上报方式。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('两个业务按钮', 36, 84);

    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (tagged) {
      drawingContext.fillText(
        `<button class="plausible-event-name=${SIGNUP_EVENT}">`,
        36,
        112,
        midX - 60,
      );
      drawingContext.fillText(
        `<button class="plausible-event-name=${purchaseEventName().replace(/ /g, '+')}">`,
        36,
        130,
        midX - 60,
      );
      drawingContext.fillStyle = '#5d6f67';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '不写 JS：tagged-events 变体自动捕获点击',
        36,
        154,
        midX - 60,
      );
    } else {
      drawingContext.fillText(
        `报名.onclick → plausible('${SIGNUP_EVENT}')`,
        36,
        112,
        midX - 60,
      );
      drawingContext.fillText(
        `购买.onclick → plausible('${purchaseEventName()}')`,
        36,
        130,
        midX - 60,
      );
      drawingContext.fillStyle = '#5d6f67';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '点按钮即调用 window.plausible 上报',
        36,
        154,
        midX - 60,
      );
    }

    const statusColor =
      scriptStatus === '已加载'
        ? '#15803d'
        : scriptStatus === '加载中…'
          ? '#b45309'
          : '#b91c1c';
    drawingContext.fillStyle = statusColor;
    drawingContext.beginPath();
    drawingContext.arc(42, 186, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `${current.scriptFile}：${scriptStatus}`,
      56,
      191,
      midX - 80,
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
      112,
      midX - 60,
    );
    drawingContext.fillText(
      `{ n: "<事件名>", u: <本页地址>, d: "${DOMAIN}" }`,
      midX + 36,
      130,
      midX - 60,
    );

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `核对：${PLAUSIBLE_ORIGIN}/${DOMAIN}/settings/goals`,
      midX + 36,
      168,
      midX - 60,
    );
    drawingContext.fillText(
      '添加同名 Custom event Goal 后，看板底部',
      midX + 36,
      190,
      midX - 60,
    );
    drawingContext.fillText(
      'Goals 区块出现转化；未添加则事件照收但不显示',
      midX + 36,
      208,
      midX - 60,
    );

    if (scriptStatus.startsWith('加载失败')) {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        '请先启动本地实例（见「本地实例」一课）',
        midX + 36,
        234,
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
      const purchaseChanged =
        appliedKey !== undefined &&
        options.purchaseEvent.trim() !== current.purchaseEvent.trim();
      current = options;
      if (purchaseChanged) {
        // 只改事件名不需要重新注入脚本；tagged 模式下换一下按钮上的标注类。
        syncButtons();
      }
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
      // tagged 变体注册的 document 级监听无法随脚本元素移除，
      // 先摘掉按钮上的标注类，保证离开本页后点击不再触发事件。
      for (const button of [signupButton, purchaseButton]) {
        for (const cls of Array.from(button.classList)) {
          if (cls.startsWith('plausible-event-name')) {
            button.classList.remove(cls);
          }
        }
        button.remove();
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
