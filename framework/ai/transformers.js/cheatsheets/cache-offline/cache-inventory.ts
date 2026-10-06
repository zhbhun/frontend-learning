/**
 * 范例：transformers-cache 缓存清单——用 Cache API 直接读取兄弟课程留下的真实条目。
 *
 * - 演示内容：caches.open 打开默认缓存桶（env.cacheKey = 'transformers-cache'），
 *   keys() 列出条目、match() 读 Content-Length 体积；再按「浏览器缓存键 = 完整远端
 *   URL」的规则手工构造 URL 逐文件 match，验证命中判定与 revision 在键里的角色。
 * - 前置状态：不导入库、不发任何网络请求，条目来自本浏览器运行过的兄弟课程
 *   （1.2 情感分类 / 3.1.4 句向量 / 3.2.1 图像分类 / 3.3.1 语音识别等）；
 *   全新浏览器显示 0 条也是有效观察结果。
 * - 主要操作：Controls 切换「观察对象」与「revision 探针」。
 * - 预期结果：模型条目 URL 形如 huggingface.co/<模型ID>/resolve/main/<文件>；
 *   以 main 构造的键全部命中；切到探针 revision 后 0 命中——版本变了键就变。
 * - 阅读主线：readEntries（开桶 → keys → match 记账）→ refreshView（按视图过滤、
 *   构造 URL 探针）→ draw（清单与探针结论渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 与库默认值一致（env.cacheKey）；改过 cacheKey 的页面请换成自己的桶名
const CACHE_NAME = 'transformers-cache';

// 探针用的"新版本" revision：任何课程都没用它下载过，用于演示键失配
const PROBE_REVISION = 'v9-upgrade-probe';

export type ViewKey = 'distilbert' | 'minilm' | 'mobilevit' | 'whisper' | 'wasm' | 'all';

export type ProbeKey = 'main' | 'upgrade';

export type InventoryStatus = 'loading' | 'ready' | 'error';

/** 一条缓存条目解析后的归类结果 */
interface EntryInfo {
  group: 'model' | 'wasm' | 'other';
  modelId: string | null;
  revision: string | null;
  file: string | null;
}

interface CacheEntry {
  url: string;
  info: EntryInfo;
  /** Content-Length 头读数（字节）；响应头缺失时为 null */
  sizeBytes: number | null;
}

export interface InventorySnapshot {
  status: InventoryStatus;
  message: string;
  cacheName: string | null;
  totalCount: number;
  viewCount: number;
  viewSizeText: string;
  probeRevision: string;
  probeHits: number;
  probeTotal: number;
  probeConclusion: string;
}

export interface CacheInventoryInstance {
  update(options: InventoryOptions): void;
  dispose(): void;
}

export interface InventoryOptions {
  view: ViewKey;
  probe: ProbeKey;
}

/** 模型视图预设：与兄弟课程实例加载的模型一致，便于对照观察 */
const VIEW_MODEL_IDS: Record<Exclude<ViewKey, 'wasm' | 'all'>, string> = {
  distilbert: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  minilm: 'Xenova/all-MiniLM-L6-v2',
  mobilevit: 'Xenova/mobilevit-small',
  whisper: 'Xenova/whisper-tiny.en',
};

/** 把字节格式化成十进制 MB（与兄弟课程的体积口径一致） */
function formatBytes(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

/** 按库的 URL 规则解析条目：模型文件键含 /resolve/<revision>/，WASM 键是 CDN 文件 URL */
function classifyEntry(url: string): EntryInfo {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { group: 'other', modelId: null, revision: null, file: null };
  }

  if (parsed.hostname === 'huggingface.co' || parsed.hostname === 'hf.co') {
    // remotePathTemplate 默认 '{model}/resolve/{revision}/'，文件名含 onnx/ 子目录
    const match = parsed.pathname.match(/^\/(.+)\/resolve\/([^/]+)\/(.+)$/);
    if (match) {
      return { group: 'model', modelId: match[1], revision: match[2], file: match[3] };
    }
  }

  const fileName = parsed.pathname.split('/').pop() ?? '';
  if (parsed.pathname.includes('/onnxruntime-web/') || fileName.startsWith('ort-wasm')) {
    return { group: 'wasm', modelId: null, revision: null, file: fileName || null };
  }

  return { group: 'other', modelId: null, revision: null, file: null };
}

/** 打开缓存桶并逐条 match 记账：keys() 拿键，match() 读响应头体积 */
async function readEntries(cache: Cache): Promise<CacheEntry[]> {
  const requests = await cache.keys();
  return Promise.all(
    requests.map(async (request) => {
      let sizeBytes: number | null = null;
      try {
        const response = await cache.match(request);
        const length = Number(response?.headers.get('content-length'));
        if (Number.isFinite(length) && length > 0) {
          sizeBytes = length;
        }
      } catch {
        // 单条读取失败不影响清单其余条目
      }
      return { url: request.url, info: classifyEntry(request.url), sizeBytes };
    }),
  );
}

/** 行显示名：模型条目只显示文件名，WASM 显示运行时文件名，其他显示 URL 尾部 */
function rowLabel(entry: CacheEntry): string {
  if ((entry.info.group === 'model' || entry.info.group === 'wasm') && entry.info.file) {
    return entry.info.file;
  }
  return entry.url.split('/').slice(-2).join('/');
}

function sizeTextOf(entry: CacheEntry): string {
  return entry.sizeBytes === null ? '—' : formatBytes(entry.sizeBytes);
}

export function createCacheInventory(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InventorySnapshot) => void,
): CacheInventoryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: InventoryOptions = { view: 'distilbert', probe: 'main' };
  let status: InventoryStatus = 'loading';
  let message = '正在读取本地缓存（caches.open → keys → match，不发网络请求）…';
  let cache: Cache | null = null;
  let entries: CacheEntry[] = [];

  // 视图与探针的派生结果：由 refreshView 异步计算，token 防止过期结果覆盖新视图
  let viewEntries: CacheEntry[] = [];
  let viewSizeText = '—';
  let probeRevision = 'main';
  let probeHits = 0;
  let probeTotal = 0;
  let probeConclusion = '等待缓存读取…';

  let disposed = false;
  let token = 0;

  function snapshot(): InventorySnapshot {
    return {
      status,
      message,
      cacheName: status === 'error' ? null : CACHE_NAME,
      totalCount: entries.length,
      viewCount: viewEntries.length,
      viewSizeText,
      probeRevision,
      probeHits,
      probeTotal,
      probeConclusion,
    };
  }

  function drawAndEmit() {
    draw();
    emit(snapshot());
  }

  /** 当前视图的条目集合：模型视图按 modelId 过滤，WASM / 全部按组 */
  function selectView(): CacheEntry[] {
    if (current.view === 'all') {
      return entries;
    }
    if (current.view === 'wasm') {
      return entries.filter((entry) => entry.info.group === 'wasm');
    }
    const modelId = VIEW_MODEL_IDS[current.view];
    return entries.filter((entry) => entry.info.modelId === modelId);
  }

  function conclude(hits: number, total: number, revision: string): string {
    if (total === 0) {
      const hint =
        current.view === 'wasm'
          ? '先运行任意一次带推理的兄弟课程（运行时文件随首次会话写入）'
          : '先运行对应课程的实例（条目随模型加载写入）';
      return `该视图在本缓存中没有条目——${hint}`;
    }
    if (hits === total) {
      return revision === 'main'
        ? '全部命中：按 URL 规则构造的键可直接读取，不联网也能加载（离线可用）'
        : '全部命中（意外）：探针 revision 下居然有条目，检查是否手动预缓存过';
    }
    if (hits === 0) {
      return revision === PROBE_REVISION
        ? '全部失配：revision 参与 URL 键，模型升级后旧条目全部命中不了——下次加载重新下载，旧条目仍占存储'
        : '0 命中：该模型的条目不是以 revision=main 写入的（检查加载时的 options.revision）';
    }
    return '部分命中：只有 revision 一致的条目能命中，其余将走网络';
  }

  /** 按当前 Controls 重算视图清单与探针：全部是本地缓存操作 */
  async function refreshView() {
    const run = ++token;
    if (!cache) {
      return;
    }
    const selected = selectView();
    const totalBytes = selected.reduce((sum, entry) => sum + (entry.sizeBytes ?? 0), 0);
    const knownCount = selected.filter((entry) => entry.sizeBytes !== null).length;
    viewEntries = selected;
    viewSizeText = knownCount > 0 ? formatBytes(totalBytes) : '—';

    probeRevision = current.probe === 'main' ? 'main' : PROBE_REVISION;
    probeHits = 0;
    probeTotal = 0;
    drawAndEmit();

    // 探针只针对模型视图：构造「远端 URL = 缓存键」逐文件 match（与库的查找同构）
    const modelId =
      current.view === 'wasm' || current.view === 'all' ? null : VIEW_MODEL_IDS[current.view];
    if (!modelId) {
      probeConclusion = '探针针对单个模型的条目；先选择一个模型视图';
      if (run !== token || disposed) {
        return;
      }
      drawAndEmit();
      return;
    }

    const files = [
      ...new Set(
        selected.map((entry) => entry.info.file).filter((file): file is string => Boolean(file)),
      ),
    ];
    let hits = 0;
    for (const file of files) {
      const probeUrl = `https://huggingface.co/${modelId}/resolve/${probeRevision}/${file}`;
      try {
        if (await cache.match(probeUrl)) {
          hits += 1;
        }
      } catch {
        // 匹配失败按未命中处理
      }
    }
    if (run !== token || disposed) {
      return;
    }
    probeHits = hits;
    probeTotal = files.length;
    probeConclusion = conclude(hits, files.length, probeRevision);
    drawAndEmit();
  }

  async function init() {
    try {
      if (typeof caches === 'undefined') {
        throw new Error('当前环境没有 Cache API（需要 https 或 localhost）。');
      }
      cache = await caches.open(CACHE_NAME);
      if (disposed) {
        return;
      }
      entries = await readEntries(cache);
      if (disposed) {
        return;
      }
      status = 'ready';
      message =
        entries.length > 0
          ? `读取到 ${entries.length} 条真实条目——都是兄弟课程写入的`
          : '缓存为空：先运行一次带推理的兄弟课程（如 1.2），再回来看真实条目';
    } catch (error) {
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      message = `读取缓存失败：${detail}`;
    }
    drawAndEmit();
    await refreshView();
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
    drawingContext.fillText('transformers-cache 缓存清单', 48, 42);
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('本地读取 · 不发网络请求', width - 48, 42);
    drawingContext.textAlign = 'left';

    // ① 当前视图的条目清单：URL 键的文件名部分 + Content-Length 体积
    drawingContext.fillStyle = '#1d4ed8';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`① 条目清单（${viewEntries.length} 条 · 合计 ${viewSizeText}）`, 48, 72);
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    const rowHeight = 20;
    const listTop = 82;
    const maxRows = Math.max(1, Math.min(7, Math.floor((height - listTop - 96) / rowHeight)));
    viewEntries.slice(0, maxRows).forEach((entry, index) => {
      const revisionTag =
        entry.info.revision && entry.info.revision !== 'main' ? ` · rev:${entry.info.revision}` : '';
      drawingContext.fillStyle = entry.info.group === 'wasm' ? '#0f766e' : '#334155';
      drawingContext.fillText(
        fitText(`${rowLabel(entry)} · ${sizeTextOf(entry)}${revisionTag}`, contentWidth),
        48,
        listTop + 14 + index * rowHeight,
      );
    });
    const shownRows = Math.min(viewEntries.length, maxRows);
    if (viewEntries.length > shownRows) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText(
        `… 还有 ${viewEntries.length - shownRows} 条（总数见 readout）`,
        48,
        listTop + 14 + shownRows * rowHeight,
      );
    }

    // ② 命中判定探针：构造 URL 逐文件 match，结论一行
    const probeTop = height - 74;
    drawingContext.fillStyle = '#0f766e';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    const probeLabel =
      probeTotal > 0
        ? `② 命中判定：revision=${probeRevision} → ${probeHits}/${probeTotal} 命中`
        : '② 命中判定：—';
    drawingContext.fillText(probeLabel, 48, probeTop);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(fitText(probeConclusion, contentWidth), 48, probeTop + 22);

    // 状态信息放右下角，避开左下角的 readout 面板
    drawingContext.textAlign = 'right';
    drawingContext.fillStyle =
      status === 'error' ? '#b91c1c' : status === 'loading' ? '#475569' : '#15803d';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(fitText(message, contentWidth), width - 48, height - 18);
    drawingContext.textAlign = 'left';
  }

  const resizeObserver = createResizeObserver(canvas, drawAndEmit);
  drawAndEmit();
  void init();

  return {
    update(options) {
      current = options;
      if (disposed || !cache) {
        drawAndEmit();
        return;
      }
      void refreshView();
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
    },
  };
}
