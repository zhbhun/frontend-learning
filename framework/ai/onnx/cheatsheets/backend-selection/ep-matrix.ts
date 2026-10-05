/**
 * 范例：对同一份 MNIST 模型依次尝试五种 executionProviders 组合，把「选择与回退」的
 * 每种结局真实跑一遍：生效、移除警告兜底、全部不可用抛错。
 * 前置状态：浏览器需能访问 ort wasm 资源 CDN 与 MNIST 模型（约 26KB，运行时拉取，
 * 不进仓库）。本页导入的是默认入口 onnxruntime-web（注册 webgpu/webnn/cpu/wasm，
 * 不含 webgl）——这本身就是实例的前提之一。
 * 操作：用 Storybook 的 combo 参数切换组合；每次切换按新组合创建会话（结果缓存，
 * 已跑过的组合不重复创建；失败组合点击画布可重试）。
 * 预期结果（Chrome 桌面、无 WebNN 标志的典型环境）：
 * - ['wasm']：基线，创建成功，无警告。
 * - ['webgpu', 'wasm']：两个 EP 同属一个后端对象，都传入会话，无警告，由 JSEP 分区
 *   （MNIST 算子全有 GPU 内核时整图在 GPU，CPU 侧兜底）。
 * - ['webnn', 'wasm']：webnn 初始化抛「WebNN is not supported in current environment」，
 *   ort 发出 removing requested execution provider "webnn" … 警告并把它移出数组，
 *   会话照常创建（实例在创建期间捕获这条警告并显示原文）。
 * - ['webgl', 'wasm']：默认入口未注册 webgl（backend not found.），同样警告 + 兜底。
 * - ['webgl']：唯一请求不可用且无兜底 → create 抛
 *   「no available backend found. ERR: [webgl] backend not found.」，模型根本不下载。
 * ort 没有读取「会话实际用了哪个后端」的公开 API：生效列表由移除警告与 create
 * 行为推定，读数里如实标注「推定」。
 * 阅读主线：probeBackends（能力检测链）→ createFor（捕获警告 + 创建会话 + 计时）→
 * createCombo（按组合缓存）与 pump（切换组合的串行调度）；画布卡片与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

export interface ComboOption {
  /** Controls 面板里显示的字面量，与代码里写的数组一一对应。 */
  label: string;
  /** 传给 InferenceSession.create 的 executionProviders。 */
  eps: readonly string[];
}

/** 实例提供的五种组合：四种「带 wasm 兜底」+ 一种「单独请求」的失败现场。 */
export const COMBO_OPTIONS: readonly ComboOption[] = [
  { label: "['wasm']", eps: ['wasm'] },
  { label: "['webgpu', 'wasm']", eps: ['webgpu', 'wasm'] },
  { label: "['webnn', 'wasm']", eps: ['webnn', 'wasm'] },
  { label: "['webgl', 'wasm']", eps: ['webgl', 'wasm'] },
  { label: "['webgl']", eps: ['webgl'] },
];

export interface BackendProbe {
  /** navigator.gpu 是否存在。 */
  gpuPresent: boolean;
  /** requestAdapter() 的结果：适配器信息、null 或错误原因。 */
  adapter: string;
  /** navigator.ml 是否存在（WebNN API 的入口对象）。 */
  mlPresent: boolean;
  /** 探测 canvas 能否取得 WebGL 上下文。 */
  webglContext: boolean;
}

/** 能力检测链：每一级给出原始读数，而不是折叠成一个布尔值。 */
export async function probeBackends(): Promise<BackendProbe> {
  const webglContext = probeWebGlContext();
  const mlPresent = Boolean((navigator as { ml?: unknown }).ml);
  const gpu = (navigator as { gpu?: unknown }).gpu;
  if (!gpu) {
    return {
      gpuPresent: false,
      adapter: 'navigator.gpu 不存在',
      mlPresent,
      webglContext,
    };
  }

  let adapter: unknown;
  try {
    adapter = await (
      gpu as { requestAdapter(): Promise<unknown> }
    ).requestAdapter();
  } catch (error) {
    return {
      gpuPresent: true,
      adapter: `requestAdapter() 抛错：${
        error instanceof Error ? error.message : String(error)
      }`,
      mlPresent,
      webglContext,
    };
  }

  return {
    gpuPresent: true,
    adapter: adapter ? '已取得 GPUAdapter' : 'requestAdapter() 返回 null',
    mlPresent,
    webglContext,
  };
}

/** 用离屏探测 canvas 试取一次 WebGL 上下文，用完即弃。 */
function probeWebGlContext(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * ort 没有「查询会话用了哪个后端」的 API；它表达「EP 不可用」的方式是
 * console.warn（removing requested execution provider …）。这里在 create
 * 期间临时包裹 console.warn 把警告原文收集起来，同时照常输出，不吞不改。
 */
export async function captureWarnings<T>(
  task: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((item) => String(item)).join(' '));
    original(...args);
  };
  try {
    return { result: await task(), warnings };
  } finally {
    console.warn = original;
  }
}

export interface ComboResult {
  status: 'ok' | 'error';
  /** create 抛错时的原文（status === 'error'）。 */
  error?: string;
  /** create 期间 ort 发出的警告原文（成功与失败都可能为空）。 */
  warnings: string[];
  /** 本次 create 的耗时；失败时是走到抛错的耗时（webgl-only 不下载模型）。 */
  createMs: number;
  session?: InferenceSession;
}

const comboResults = new Map<string, Promise<ComboResult>>();

/** 按组合创建会话并缓存结果（含失败结果）；retry = true 时丢弃缓存重新创建。 */
export function createCombo(
  eps: readonly string[],
  { retry = false }: { retry?: boolean } = {},
): Promise<ComboResult> {
  const key = eps.join('|');
  if (retry) {
    comboResults.delete(key);
  }
  let promise = comboResults.get(key);
  if (!promise) {
    env.wasm.numThreads = 1; // 本工作区页面无跨域隔离响应头，保持单线程
    env.wasm.wasmPaths = WASM_CDN;
    promise = createFor(eps);
    comboResults.set(key, promise);
  }
  return promise;
}

/**
 * 单次创建。注册表在模型下载前完成后端解析：全部请求不可用时 create 在这里
 * 抛错（webgl-only 几乎即时、不带网络开销）；有兜底时返回警告文本。
 */
async function createFor(eps: readonly string[]): Promise<ComboResult> {
  const start = performance.now();
  const { result, warnings } = await captureWarnings(() =>
    InferenceSession.create(MODEL_URL, {
      executionProviders: [...eps],
    }),
  );
  return { status: 'ok', warnings, createMs: performance.now() - start, session: result };
}

/** 用空输入预热一次再计时 5 次取均值：证明这个组合的会话真实在执行。 */
export async function measureSession(
  session: InferenceSession,
  runs = 5,
): Promise<number> {
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: new Tensor(
      'float32',
      new Float32Array(1 * 1 * 28 * 28),
      [1, 1, 28, 28],
    ),
  };
  await session.run(feeds);
  const start = performance.now();
  for (let index = 0; index < runs; index += 1) {
    await session.run(feeds);
  }
  return (performance.now() - start) / runs;
}

/** 从移除警告里抽出 ort 的原因原文（冒号之后的部分）。 */
export function warningReason(warnings: readonly string[], ep: string): string {
  const marker = `removing requested execution provider "${ep}"`;
  const found = warnings.find((line) => line.includes(marker));
  if (!found) {
    return '';
  }
  const index = found.indexOf(marker);
  const tail = found.slice(index + marker.length);
  const colon = tail.indexOf(': ');
  return colon === -1 ? tail.trim() : tail.slice(colon + 2).trim();
}

export interface EpVerdict {
  name: string;
  /** active：传入会话；removed：被移除（附 ort 原因原文）。 */
  verdict: 'active' | 'removed';
  reason: string;
}

export interface EpMatrixSnapshot {
  status: 'running' | 'ready' | 'error';
  message: string;
  comboLabel: string;
  gpuPresent: string;
  adapter: string;
  mlPresent: string;
  webglContext: string;
  createOutcome: string;
  ortWarnings: string;
  /** 生效 EP 列表：依「请求列表 − 被移除者」推定，ort 无直接查询 API。 */
  effectiveEps: string;
  createMs: string;
  runMean: string;
  verdicts: EpVerdict[];
  /** 会话创建是否成功，决定画布会话卡的高亮。 */
  sessionOk: boolean;
}

export interface EpMatrixArgs {
  combo: string;
}

export interface EpMatrixInstance {
  update(args: EpMatrixArgs): void;
  dispose(): void;
}

export function createEpMatrix(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EpMatrixSnapshot) => void,
): EpMatrixInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let desired = COMBO_OPTIONS[1];
  let ranLabel: string | undefined;
  let running = false;
  let runToken = 0;

  const probe: BackendProbe = {
    gpuPresent: false,
    adapter: '—',
    mlPresent: false,
    webglContext: false,
  };

  let status: EpMatrixSnapshot['status'] = 'running';
  let message = '等待首次运行…';
  let result: ComboResult | undefined;
  let runMean: number | null = null;

  function emitSnapshot() {
    const verdicts: EpVerdict[] = desired.eps.map((name) => {
      const reason = result ? warningReason(result.warnings, name) : '';
      return reason
        ? { name, verdict: 'removed' as const, reason }
        : { name, verdict: 'active' as const, reason: '' };
    });
    const effective = verdicts
      .filter((item) => item.verdict === 'active')
      .map((item) => item.name);
    const removed = verdicts.filter((item) => item.verdict === 'removed');
    emit({
      status,
      message,
      comboLabel: desired.label,
      gpuPresent: probe.gpuPresent ? '存在' : '不存在',
      adapter: probe.adapter,
      mlPresent: probe.mlPresent ? '存在' : '不存在',
      webglContext: probe.webglContext ? '可创建' : '不可创建',
      createOutcome: result
        ? result.status === 'ok'
          ? '成功'
          : `失败：${result.error ?? ''}`
        : '—',
      ortWarnings:
        result && result.warnings.length > 0 ? result.warnings.join(' ┃ ') : '无',
      effectiveEps:
        removed.length > 0
          ? `${effective.join(' + ')}（移除后兜底，推定）`
          : result?.status === 'ok'
            ? `${effective.join(' + ')}（${
                effective.length > 1 ? '同属一个后端对象，JSEP 分区' : '整图在该 EP'
              }，推定）`
            : '—',
      createMs: result ? `${result.createMs.toFixed(0)} ms` : '—',
      runMean: runMean !== null ? `${runMean.toFixed(2)} ms` : '—',
      verdicts,
      sessionOk: result?.status === 'ok',
    });
  }

  interface CardState {
    title: string;
    /** primary：生效；muted：移除；danger：失败。 */
    tone: 'primary' | 'muted' | 'danger';
    badge: string;
    lines: string[];
  }

  function drawCard(x: number, width: number, card: CardState) {
    const y = 22;
    const height = 116;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle =
      card.tone === 'primary'
        ? '#eef3ff'
        : card.tone === 'danger'
          ? '#fdf0ef'
          : '#fbf7ef';
    ctx.fill();
    ctx.strokeStyle =
      card.tone === 'primary'
        ? '#4f7cff'
        : card.tone === 'danger'
          ? '#c2544a'
          : '#cfa253';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(card.title, x + 14, y + 26);

    const badgeWidth = 40;
    ctx.beginPath();
    ctx.roundRect(x + width - badgeWidth - 12, y + 12, badgeWidth, 20, 10);
    ctx.fillStyle =
      card.tone === 'primary'
        ? '#4f7cff'
        : card.tone === 'danger'
          ? '#c2544a'
          : '#cfa253';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.badge, x + width - badgeWidth / 2 - 12, y + 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    card.lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 52 + index * 19, width - 28);
    });
  }

  /** 把原因原文按卡片宽度折成至多两行。 */
  function truncate(text: string, cardWidth: number, maxLines = 2): string[] {
    const limit = Math.max(20, Math.floor((cardWidth - 28) / 7));
    const lines: string[] = [];
    let rest = text;
    while (rest.length > limit && lines.length < maxLines - 1) {
      lines.push(rest.slice(0, limit));
      rest = rest.slice(limit);
    }
    lines.push(rest.length > limit ? `${rest.slice(0, limit - 1)}…` : rest);
    return lines;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(520, size.width);
    const height = 232;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 28;
    const gap = 14;
    const cardCount = desired.eps.length + 1;
    const cardWidth = (width - margin * 2 - gap * (cardCount - 1)) / cardCount;

    const cards: CardState[] = desired.eps.map((name) => {
      const reason = result ? warningReason(result.warnings, name) : '';
      if (reason) {
        return {
          title: `"${name}"`,
          tone: 'muted' as const,
          badge: '移除',
          lines: truncate(reason, cardWidth),
        };
      }
      // 全部不可用的抛错路径不发警告（注册表直接 throw）：
      // 此时 create 失败本身就是「未生效」的证据，不能按默认判成生效。
      if (result?.status === 'error') {
        return {
          title: `"${name}"`,
          tone: 'danger' as const,
          badge: '失败',
          lines: truncate(result.error ?? 'create 失败', cardWidth),
        };
      }
      const note =
        desired.eps.length > 1 && result?.status === 'ok'
          ? '与同组 EP 属同一后端对象'
          : '注册表中初始化成功';
      return {
        title: `"${name}"`,
        tone: 'primary' as const,
        badge: '生效',
        lines: [note],
      };
    });

    if (result?.status === 'ok') {
      cards.push({
        title: '会话',
        tone: 'primary',
        badge: '已建',
        lines: [
          `create ${result.createMs.toFixed(0)} ms · run 均值 ${
            runMean !== null ? `${runMean.toFixed(2)} ms` : '…'
          }`,
          status === 'ready' ? '空输入推理执行通过' : '推理计时中…',
        ],
      });
    } else {
      cards.push({
        title: '会话',
        tone: 'danger',
        badge: status === 'running' ? '…' : '失败',
        lines: truncate(
          status === 'running' ? message : (result?.error ?? message),
          cardWidth,
        ),
      });
    }

    cards.forEach((card, index) => {
      drawCard(margin + (cardWidth + gap) * index, cardWidth, card);
    });

    const conclusionY = 22 + 116 + 40;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    if (status === 'running') {
      ctx.fillStyle = '#64748b';
      ctx.fillText(message, margin, conclusionY);
    } else if (result?.status === 'error') {
      ctx.fillStyle = '#991b1b';
      ctx.fillText(
        '全部请求的 EP 都不可用：create 直接抛错，模型不下载。点击画布可重试',
        margin,
        conclusionY,
      );
    } else {
      const removedNames = desired.eps.filter(
        (name) => result && warningReason(result.warnings, name),
      );
      const effectiveNames = desired.eps.filter(
        (name) => !result || !warningReason(result.warnings, name),
      );
      ctx.fillStyle = '#172033';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        removedNames.length > 0
          ? `${removedNames
              .map((name) => `"${name}"`)
              .join('、')}被移除，会话按剩余 EP 创建——回退发生在 create 内部`
          : '全部请求的 EP 都生效；EP 之间的分工由 JSEP 在创建期分区',
        margin,
        conclusionY - 14,
      );
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(
        `生效列表（推定）：${effectiveNames.join(' · ')}`,
        margin,
        conclusionY + 8,
      );
    }

    emitSnapshot();
  }

  async function run(next: ComboOption) {
    if (running) {
      return;
    }
    running = true;
    runToken += 1;
    const token = runToken;
    status = 'running';
    message = `按 ${next.label} 解析后端并创建会话…`;
    result = undefined;
    runMean = null;
    draw();

    try {
      Object.assign(probe, await probeBackends());
      const created = await createCombo(next.eps);
      if (token !== runToken) {
        running = false;
        return;
      }
      result = created;
      if (created.status === 'ok' && created.session) {
        runMean = await measureSession(created.session);
      } else {
        status = 'error';
        message = created.error ?? '创建失败';
      }
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
    }
    if (token === runToken) {
      if (status !== 'error') {
        status = 'ready';
        message = '就绪';
      }
      draw();
    }
    running = false;
    pump();
  }

  function findOption(label: string): ComboOption {
    return (
      COMBO_OPTIONS.find((option) => option.label === label) ??
      COMBO_OPTIONS[1]
    );
  }

  /** 串行调度：运行中切换组合时记住最新诉求，当前运行结束后立即接续。 */
  function pump() {
    if (running || desired.label === ranLabel) {
      return;
    }
    ranLabel = desired.label;
    void run(desired);
  }

  function onClick() {
    if (status === 'error' && !running) {
      void run(desired);
    }
  }

  canvas.style.cursor = 'default';
  canvas.addEventListener('click', onClick);
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      desired = findOption(args.combo);
      pump();
    },
    dispose() {
      runToken += 1; // 使在飞回调失效
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      // 不释放缓存的会话：同一页面里其他内嵌实例可能仍在使用；释放策略见「内存管理」课程。
    },
  };
}
