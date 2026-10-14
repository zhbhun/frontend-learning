/**
 * 范例：给自定义事件附加自定义属性（props），观察真实上报请求中的 props 内容。
 * 输入：plan 属性值（plan，来自 Controls，附加到每次 Download 事件上；清空则不携带该键）。
 * 操作：点击画布上的「下载定价 PDF」「下载白皮书」按钮，分别调用
 *       plausibleWindow.plausible('Download', {props: {file: 'pricing.pdf' | 'whitepaper.pdf', plan}})。
 * 预期结果：读数显示已上报 Download 次数、最近一次上报的事件名 / props JSON / 发送结果；
 *           本地实例看板 http://localhost:8000/test.local 的 Goal Conversions →
 *           点击事件名 Download → Properties 标签可按 file / plan 展开细分。
 * 前置状态：本地 CE 实例运行中（http://localhost:8000），站点 test.local 已创建，
 *           Download 已注册为自定义事件 Goal，属性键 file / plan 已加入站点设置的
 *           Custom Properties（可先发事件再用「一键添加已发送属性」补登）。
 * 阅读主线：createCustomProperties → injectScript（注入 script.manual.local.js）
 *           → trackDownload（两个按钮共用的上报函数）
 *           → 拦截 fetch（提取发向 /api/event 的真实请求体作为证据）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 本地 CE 实例地址；脚本与上报端点（/api/event）都指向它。 */
const PLAUSIBLE_ORIGIN = 'http://localhost:8000';

/**
 * manual 变体关闭自动 pageview：页内每次上报都来自按钮点击，证据干净；
 * local 变体解除脚本对 localhost 页面（本 Docs 页）的忽略。
 */
const SCRIPT_FILE = 'script.manual.local.js';

/** 站点标识，需与实例中创建的站点逐字符一致。 */
const DOMAIN = 'test.local';

interface PlausibleOptions {
  props?: Record<string, string>;
  callback?: (result?: { status?: number; error?: unknown }) => void;
}

/** 脚本加载后被替换为真正的 track 函数；加载前是下方注入的队列桩。 */
type PlausibleFn = ((
  eventName: string,
  options?: PlausibleOptions,
) => void) & { q?: unknown[] };

/** 用局部类型断言访问 window.plausible，避免与其他课程的全局声明互相冲突。 */
const plausibleWindow = window as Window & { plausible?: PlausibleFn };

export interface CustomPropertiesOptions {
  /** 附加到每次 Download 事件上的 plan 属性值；空字符串表示不携带 plan 键。 */
  plan: string;
}

export interface CustomPropertiesSnapshot {
  scriptStatus: string;
  downloadCount: number;
  lastEvent: string;
  lastProps: string;
  lastResult: string;
}

export interface CustomPropertiesInstance {
  update(options: CustomPropertiesOptions): void;
  dispose(): void;
}

/** 两个下载按钮各自的 file 属性值：同一事件名 Download，不同属性值。 */
const DOWNLOAD_BUTTONS = [
  { label: '下载定价 PDF', file: 'pricing.pdf', top: '62%' },
  { label: '下载白皮书', file: 'whitepaper.pdf', top: '76%' },
] as const;

export function createCustomProperties(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CustomPropertiesSnapshot) => void,
): CustomPropertiesInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: CustomPropertiesOptions = { plan: 'premium' };

  let scriptEl: HTMLScriptElement | undefined;
  let scriptStatus = '尚未注入';
  let downloadCount = 0;
  let lastEvent = '—';
  let lastProps = '—';
  let lastResult = '—';

  // 拦截 window.fetch：tracker 通过 fetch POST /api/event 上报，
  // 请求体中 n 是事件名、p 是自定义属性对象，提取出来作为可核对证据。
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
          p?: Record<string, unknown>;
        };
        if (payload.n) {
          lastEvent = payload.n;
          lastProps = payload.p ? JSON.stringify(payload.p) : '（未携带 props）';
          if (payload.n === 'Download') {
            downloadCount += 1;
          }
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
    delete plausibleWindow.plausible;
    plausibleWindow.plausible = Object.assign(
      (...args: unknown[]) => {
        plausibleWindow.plausible!.q = plausibleWindow.plausible!.q || [];
        plausibleWindow.plausible!.q.push(args);
      },
      { q: [] as unknown[] },
    ) as PlausibleFn;
  }

  function injectScript() {
    scriptStatus = '加载中…';
    installQueueStub();

    // 与正文快速上手的静态写法等价的动态注入。
    const el = document.createElement('script');
    el.defer = true;
    el.setAttribute('data-domain', DOMAIN);
    el.src = `${PLAUSIBLE_ORIGIN}/js/${SCRIPT_FILE}`;
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

  /** 组装本次事件的 props：file 来自按钮，plan 来自 Controls；plan 为空则不携带该键。 */
  function buildProps(file: string): Record<string, string> {
    const props: Record<string, string> = { file };
    if (current.plan.trim() !== '') {
      props.plan = current.plan.trim();
    }
    return props;
  }

  function trackDownload(file: string) {
    if (scriptStatus.startsWith('加载失败') || !plausibleWindow.plausible) {
      lastResult = '脚本未加载，无法上报';
      sync();
      return;
    }
    if (scriptStatus !== '已加载') {
      // 调用进入队列桩，脚本加载完成后会自动补发。
      plausibleWindow.plausible('Download', { props: buildProps(file) });
      lastResult = '脚本加载中，调用已排队';
      sync();
      return;
    }
    plausibleWindow.plausible('Download', {
      props: buildProps(file),
      callback(result) {
        if (result?.status) {
          lastResult = `已上报（HTTP ${result.status}）`;
        } else if (result?.error) {
          lastResult = '上报失败：网络错误';
        } else {
          // 回调无参数说明 track 在发送前放弃了事件。
          lastResult = '已忽略：事件未发送（脚本忽略了本页）';
        }
        sync();
      },
    });
  }

  const buttons = DOWNLOAD_BUTTONS.map(({ label, file, top }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText =
      `position:absolute;left:64%;top:${top};transform:translate(-50%,-50%);` +
      'padding:6px 14px;border:1px solid #4f7cff;border-radius:6px;' +
      'background:#4f7cff;color:#fff;cursor:pointer;z-index:1;' +
      'white-space:nowrap;font:13px/1.4 ui-sans-serif,system-ui,sans-serif;';
    button.addEventListener('click', () => trackDownload(file));
    canvas.parentElement?.appendChild(button);
    return button;
  });

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
    const planLabel =
      current.plan.trim() === '' ? '（空：不携带）' : `"${current.plan.trim()}"`;

    // 左半：两个按钮各自携带的 props。
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('按钮与各自携带的 props', 36, 84);

    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('下载定价 PDF → file: "pricing.pdf"', 36, 112, midX - 60);
    drawingContext.fillText('下载白皮书  → file: "whitepaper.pdf"', 36, 132, midX - 60);
    drawingContext.fillText(`plan: ${planLabel}（Controls，两个按钮共用）`, 36, 160, midX - 60);

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('右下按钮相当于在页面上执行：', 36, 196, midX - 60);
    drawingContext.fillStyle = '#475569';
    drawingContext.font =
      '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(
      "plausible('Download', {props: {file, plan}})",
      36,
      216,
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
    drawingContext.arc(42, 246, 5, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(scriptStatus, 56, 251, midX - 80);

    // 右半：最近一次上报的去向与看板核对路径。
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
    const payloadLine =
      lastEvent === '—'
        ? '{ n, p } —— 尚未上报'
        : `{ n: "${lastEvent}", p: ${lastProps} }`;
    drawingContext.fillText(payloadLine, midX + 36, 132, midX - 60);

    drawingContext.fillStyle = '#5d6f67';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('看板核对：Goal Conversions →', midX + 36, 196, midX - 60);
    drawingContext.fillText('点击事件名 Download →', midX + 36, 214, midX - 60);
    drawingContext.fillText('Properties 标签选 file / plan', midX + 36, 232, midX - 60);

    if (scriptStatus.startsWith('加载失败')) {
      drawingContext.fillStyle = '#b91c1c';
      drawingContext.fillText(
        '请先启动本地实例（见「本地实例」一课）',
        midX + 36,
        258,
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
    emit({ scriptStatus, downloadCount, lastEvent, lastProps, lastResult });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  let injected = false;

  return {
    update(options) {
      current = options;
      draw();
      // 脚本只注入一次；plan 变化只影响之后按钮点击携带的 props，无需重新注入。
      if (!injected) {
        injected = true;
        injectScript();
      }
    },
    dispose() {
      window.clearTimeout(trailingTimer);
      resizeObserver.disconnect();
      buttons.forEach((button) => button.remove());
      scriptEl?.remove();
      delete plausibleWindow.plausible;
      window.fetch = originalFetch;
    },
  };
}
