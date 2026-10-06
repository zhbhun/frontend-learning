/**
 * 范例：env 配置实验台——一个画布承载两个轻量演示，都不加载模型权重。
 *
 * - 演示 1（env.fetch 请求清单）：包装 env.fetch 给库发出的每个网络请求记账；
 *   「浏览器缓存」「本地模型」开关分别改写 env.useBrowserCache / env.allowLocalModels，
 *   「重新加载」用当前 env 设置重跑一次 AutoTokenizer.from_pretrained。
 * - 演示 2（日志级别）：「日志级别」改写 env.logLevel，然后重放一次必然产生警告的
 *   调用（max_length 不带 truncation），捕获 console 输出，观察门控效果。
 * - 前置状态：首次从 CDN 动态 import 库本体（约 1.1 MB，不经过 env.fetch，不计入清单）；
 *   分词器文件与 1.2 / 2.1.1 课共享浏览器缓存（cacheKey 同为 transformers-cache）。
 * - 预期结果：缓存未命中时清单出现 3 次远端请求（1 次 Range 元数据探测 + 2 次文件下载）；
 *   开启「本地模型」后每个文件多一次 /models/ 本地探测（404）；日志级别 ERROR / NONE
 *   时警告行被门控拦截，捕获为 0 行。
 * - 阅读主线：installFetchLedger（包装 env.fetch）→ loadTokenizer（加载与状态机）→
 *   runLogCapture（logLevel 门控演示）→ draw（日志行与清单渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，沿用 1.2 课确立的官方 CDN 动态导入；
// npm 项目请改用：import { env, LogLevel, AutoTokenizer } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型：与兄弟课相同，共享它们的浏览器缓存；只取分词器，不下载权重
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

export type LabStatus = 'loading' | 'ready' | 'error';

export type LogLevelName = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'NONE';

/** LogLevel 枚举取值（复刻 v4.3.0 源码 env.js） */
const LOG_LEVEL_VALUES: Record<LogLevelName, number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
  NONE: 50,
};

export interface EnvLabOptions {
  useBrowserCache: boolean;
  allowLocalModels: boolean;
  reload: boolean;
  logLevel: LogLevelName;
}

/** 一条 env.fetch 记账：status 为 null 表示进行中，-1 表示请求失败或被中断 */
export interface FetchRecord {
  id: number;
  kind: 'probe' | 'download' | 'local';
  method: string;
  url: string;
  status: number | null;
}

export interface CapturedLog {
  severity: string;
  text: string;
}

export interface EnvLabSnapshot {
  status: LabStatus;
  message: string;
  fetchCount: number;
  lastFetch: string | null;
  logLevelText: string;
  captureCount: number;
  captureFirst: string | null;
}

export interface EnvLabInstance {
  update(options: EnvLabOptions): void;
  dispose(): void;
}

/** 库 env 对象的本课最小读写面（完整字段见官方 env API 文档） */
interface TransformersEnvLike {
  useBrowserCache: boolean;
  allowLocalModels: boolean;
  logLevel: number;
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
}

/** 本课用到的库公开面：env、LogLevel 与 AutoTokenizer */
interface TransformersModuleLike {
  env: TransformersEnvLike;
  LogLevel: Record<LogLevelName, number>;
  AutoTokenizer: {
    from_pretrained(modelId: string): Promise<TokenizerLike>;
  };
}

/** tokenizer 调用的最小形态：本课只用一次会触发警告的同步调用 */
type TokenizerLike = (text: string, options?: Record<string, unknown>) => unknown;

/** CDN 模块是页面级共享的：多次创建实例时复用同一次 import */
let libraryPromise: Promise<TransformersModuleLike> | null = null;

function loadLibrary(): Promise<TransformersModuleLike> {
  libraryPromise ??=
    import(/* @vite-ignore */ TRANSFORMERS_CDN) as Promise<TransformersModuleLike>;
  return libraryPromise;
}

const KIND_LABELS: Record<FetchRecord['kind'], string> = {
  probe: 'Range 探测',
  download: '文件下载',
  local: '本地探测',
};

export function createEnvLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EnvLabSnapshot) => void,
): EnvLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let status: LabStatus = 'loading';
  let message = '正在从 CDN 动态 import 库本体（不经过 env.fetch，不计入清单）…';
  let current: EnvLabOptions = {
    useBrowserCache: true,
    allowLocalModels: false,
    reload: false,
    logLevel: 'WARNING',
  };

  let library: TransformersModuleLike | null = null;
  let tokenizer: TokenizerLike | null = null;
  let originalFetch: TransformersEnvLike['fetch'] | null = null;
  let loading = false;
  let disposed = false;
  let loadToken = 0;
  let pendingReload = false;

  const ledger: FetchRecord[] = [];
  let nextRecordId = 1;
  let lastFetchText: string | null = null;

  const capturedLogs: CapturedLog[] = [];
  let logLevelText = 'WARNING（30）';

  let resizeObserver: ReturnType<typeof createResizeObserver> | null = null;

  function snapshot(): EnvLabSnapshot {
    return {
      status,
      message,
      fetchCount: ledger.length,
      lastFetch: lastFetchText,
      logLevelText,
      captureCount: capturedLogs.length,
      captureFirst: capturedLogs[0]
        ? `[${capturedLogs[0].severity}] ${capturedLogs[0].text}`
        : null,
    };
  }

  // canvas 只画图形状态；readout 面板依赖 emit 送出的快照，必须与重绘同步派发
  function drawAndEmit() {
    draw();
    emit(snapshot());
  }

  function shortenUrl(url: string): string {
    return url.replace('https://huggingface.co/', '').replace(MODEL_ID, '<模型ID>');
  }

  function describeRecord(record: FetchRecord): string {
    const statusText =
      record.status === null
        ? '请求中'
        : record.status === -1
          ? '失败'
          : String(record.status);
    return `${record.method} ${shortenUrl(record.url)} → ${statusText}`;
  }

  /**
   * 演示 1 的核心：包装 env.fetch。库发起的一切网络请求——模型文件下载、
   * Range 元数据探测、WASM 运行时文件——都经过这个函数，这里逐条记账后
   * 转交原始 fetch。dispose 时恢复，避免影响同页其他课程实例。
   */
  function installFetchLedger(env: TransformersEnvLike) {
    if (originalFetch) {
      return;
    }
    originalFetch = env.fetch;
    env.fetch = (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers ?? undefined);
      // Range 头来自 get_file_metadata 的元数据探测：只取响应头、不下载内容
      const kind: FetchRecord['kind'] = /^https?:/i.test(url)
        ? headers.has('Range')
          ? 'probe'
          : 'download'
        : 'local';
      const record: FetchRecord = { id: nextRecordId++, kind, method, url, status: null };
      ledger.push(record);
      lastFetchText = describeRecord(record);
      drawAndEmit();
      const response = originalFetch!(input, init);
      response.then(
        (resolved) => {
          record.status = resolved.status;
          lastFetchText = describeRecord(record);
          if (!disposed) {
            drawAndEmit();
          }
        },
        () => {
          record.status = -1;
          lastFetchText = describeRecord(record);
          if (!disposed) {
            drawAndEmit();
          }
        },
      );
      return response;
    };
  }

  /** 把 Controls 的输入写进 env：全局可变对象，对之后的每次加载立即生效 */
  function applyEnvConfig(lib: TransformersModuleLike) {
    lib.env.useBrowserCache = current.useBrowserCache;
    lib.env.allowLocalModels = current.allowLocalModels;
    setLogLevel(lib, current.logLevel);
  }

  function setLogLevel(lib: TransformersModuleLike, name: LogLevelName) {
    lib.env.logLevel = lib.LogLevel[name];
    logLevelText = `${name}（${lib.LogLevel[name]}）`;
  }

  async function loadTokenizer() {
    if (loading || disposed) {
      return;
    }
    loading = true;
    const token = ++loadToken;
    ledger.length = 0;
    lastFetchText = null;
    status = 'loading';
    message = '正在加载分词器（tokenizer.json 约 0.7 MB，缓存未命中时需下载）…';
    drawAndEmit();
    try {
      if (!library) {
        library = await loadLibrary();
        installFetchLedger(library.env);
      }
      if (disposed) {
        return;
      }
      applyEnvConfig(library);
      const startedAt = performance.now();
      const loaded = await library.AutoTokenizer.from_pretrained(MODEL_ID);
      if (disposed || token !== loadToken) {
        return;
      }
      tokenizer = loaded;
      status = 'ready';
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      message = `就绪（用时 ${seconds} 秒）；切换开关并重跑，观察清单与日志捕获的变化`;
      drawAndEmit();
      runLogCapture();
    } catch (error) {
      if (disposed || token !== loadToken) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `加载失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；切「重新加载」重试。`;
      drawAndEmit();
    } finally {
      loading = false;
    }
    if (!disposed && pendingReload) {
      pendingReload = false;
      void loadTokenizer();
    }
  }

  /**
   * 演示 2 的核心：env.logLevel 的门控效果。触发一次已知警告（max_length
   * 不带 truncation），用 console 包装捕获库实际输出的行——调用是同步的，
   * 捕获窗口只包住这一次调用，不会混入页面其他输出。级别高于 WARNING 时
   * warn 在库内部就被拦下，捕获为 0 行。
   */
  function runLogCapture() {
    if (!library || !tokenizer || disposed) {
      return;
    }
    setLogLevel(library, current.logLevel);
    const original = {
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
    };
    const record = (severity: keyof typeof original) => (...args: unknown[]) => {
      capturedLogs.push({ severity, text: args.map(String).join(' ') });
      original[severity](...args);
    };
    capturedLogs.length = 0;
    console.warn = record('warn');
    console.error = record('error');
    console.info = record('info');
    console.log = record('log');
    try {
      // 已知警告：只传 max_length 不传 truncation，库会 warn 并自动按截断处理
      tokenizer('I love transformers!', { max_length: 8 });
    } finally {
      console.warn = original.warn;
      console.error = original.error;
      console.info = original.info;
      console.log = original.log;
    }
    drawAndEmit();
  }

  function captureEmptyReason(): string {
    if (status === 'loading') {
      return '等待分词器就绪后自动重放一次捕获…';
    }
    if (LOG_LEVEL_VALUES[current.logLevel] > LOG_LEVEL_VALUES.WARNING) {
      return '（无输出：这条 warn 在库内部就被门控拦截，级别高于 WARNING 时不打印）';
    }
    return '（本次捕获无输出）';
  }

  function severityColor(severity: string): string {
    if (severity === 'error') {
      return '#b91c1c';
    }
    if (severity === 'warn') {
      return '#b45309';
    }
    return '#1d4ed8';
  }

  function statusColor(status: number | null): string {
    if (status === null) {
      return '#64748b';
    }
    if (status >= 200 && status < 300) {
      return '#15803d';
    }
    return '#b91c1c';
  }

  function fitText(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 1 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('env 配置实验台', 48, 42);
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('清单记录当前一轮加载的 env.fetch 调用', width - 48, 42);
    drawingContext.textAlign = 'left';

    // ① 日志级别捕获：库经 logger 打到 console 的行
    drawingContext.fillStyle = '#0f766e';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`① 日志门控（env.logLevel = ${logLevelText}）`, 48, 72);
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (capturedLogs.length === 0) {
      drawingContext.fillStyle = status === 'ready' ? '#94a3b8' : '#475569';
      drawingContext.fillText(fitText(captureEmptyReason(), contentWidth), 48, 94);
    } else {
      capturedLogs.slice(0, 2).forEach((entry, index) => {
        drawingContext.fillStyle = severityColor(entry.severity);
        drawingContext.fillText(
          fitText(`[${entry.severity}] ${entry.text}`, contentWidth),
          48,
          94 + index * 20,
        );
      });
    }

    // ② env.fetch 请求清单：最近几条，旧的折叠成一行计数
    const listTop = 152;
    drawingContext.fillStyle = '#1d4ed8';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`② env.fetch 请求清单（共 ${ledger.length} 条）`, 48, listTop);
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const rowHeight = 21;
    const maxRows = Math.max(1, Math.min(6, Math.floor((height - listTop - 52) / rowHeight)));
    const visible = ledger.slice(-maxRows);
    const skipped = ledger.length - visible.length;
    visible.forEach((record, index) => {
      drawingContext.fillStyle = statusColor(record.status);
      drawingContext.fillText(
        fitText(
          `#${record.id} ${describeRecord(record)} · ${KIND_LABELS[record.kind]}`,
          contentWidth,
        ),
        48,
        listTop + 22 + index * rowHeight,
      );
    });
    if (skipped > 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(
        `… 之前还有 ${skipped} 条（计数见 readout）`,
        48,
        listTop + 22 + visible.length * rowHeight,
      );
    }

    // 状态信息放右下角，避开左下角的 readout 面板
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle =
      status === 'error' ? '#b91c1c' : status === 'loading' ? '#475569' : '#15803d';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(fitText(message, contentWidth), width - 48, height - 18);
    drawingContext.textAlign = 'left';
  }

  resizeObserver = createResizeObserver(canvas, drawAndEmit);
  drawAndEmit();
  void loadTokenizer();

  return {
    update(options) {
      const previous = current;
      current = options;
      if (disposed) {
        return;
      }
      if (library && options.logLevel !== previous.logLevel) {
        // 日志级别立即生效并重放捕获，无需重新加载
        runLogCapture();
      }
      const envChanged =
        options.useBrowserCache !== previous.useBrowserCache ||
        options.allowLocalModels !== previous.allowLocalModels ||
        options.reload !== previous.reload;
      if (envChanged) {
        if (loading) {
          pendingReload = true;
        } else {
          void loadTokenizer();
        }
      } else if (!library) {
        void loadTokenizer();
      } else {
        drawAndEmit();
      }
    },
    dispose() {
      disposed = true;
      resizeObserver?.disconnect();
      // 恢复 env 默认值：CDN 模块是页面级共享的，避免影响兄弟课程实例
      if (library) {
        if (originalFetch) {
          library.env.fetch = originalFetch;
          originalFetch = null;
        }
        library.env.useBrowserCache = true;
        library.env.allowLocalModels = false;
        library.env.logLevel = library.LogLevel.WARNING;
      }
      tokenizer = null;
    },
  };
}
