/**
 * 范例：检测本页 wasm 后端的实际运行形态——SIMD、跨域隔离、线程数与所选工件。
 * 前置状态：浏览器需能访问 ort wasm 资源 CDN 与 MNIST 模型（约 26KB，运行时拉取，
 * 不进仓库）；本工作区页面没有 COOP/COEP 响应头，属未隔离环境。
 * 操作：无参数。实例打开时自动检测环境 → 创建 wasm 会话 → 用空输入跑一次推理计时。
 * 预期结果：画布高亮三种形态里当前命中的组合，读数给出每项检测的原始值。本页应看到：
 * 固定宽度 SIMD 支持、crossOriginIsolated = 否、numThreads 在第一次 create 后被
 * 归一化为 1、实际拉取的工件是 ort-wasm-simd-threaded.jsep.*（默认入口的 JSEP 工件）
 * ——即「单线程 + SIMD」形态。
 * 阅读主线：probeEnvironment（探测字节码与隔离状态）→ loadSession（刻意不设
 * numThreads，create 前后各读一次，观察归一化）→ loadedArtifacts（performance
 * 资源记录里提取工件名）；形态卡片与读数属于演示外壳。
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

/**
 * ort 1.30.0 内部做能力检测用的三段 wasm 模块字节码
 * （摘自 dist/ort.bundle.min.mjs，与运行时自身的探测完全一致）：
 * - 固定宽度 SIMD：模块使用固定宽度向量指令，不支持 SIMD 的实现校验失败；
 * - relaxed SIMD：模块使用 relaxed 点积指令，仅支持 relaxed 提案的实现可通过；
 * - 多线程：声明共享内存（flags = 3）并使用 atomic.wait32，需线程提案支持。
 */
const FIXED_SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28,
  0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  253, 186, 1, 26, 11,
]);
const RELAXED_SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 19, 1,
  17, 0, 65, 1, 253, 15, 65, 2, 253, 15, 65, 3, 253, 15, 253, 147, 2, 11,
]);
const THREADS_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1,
  1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11,
]);

export interface EnvironmentProbe {
  fixedSimd: boolean;
  relaxedSimd: boolean;
  /** SharedArrayBuffer 存在，且共享内存 + 原子指令模块可校验——多线程的硬前提。 */
  sharedThreads: boolean;
  crossOriginIsolated: boolean;
  hardwareConcurrency: number | null;
}

/** 与 ort 相同的方式探测浏览器能力：模块字节码能否通过 WebAssembly.validate。 */
export function probeEnvironment(): EnvironmentProbe {
  const validate = (bytes: Uint8Array<ArrayBuffer>): boolean => {
    try {
      return WebAssembly.validate(bytes);
    } catch {
      return false;
    }
  };

  let sharedThreads = false;
  try {
    sharedThreads =
      typeof SharedArrayBuffer !== 'undefined' && validate(THREADS_PROBE);
  } catch {
    sharedThreads = false;
  }

  return {
    fixedSimd: validate(FIXED_SIMD_PROBE),
    relaxedSimd: validate(RELAXED_SIMD_PROBE),
    sharedThreads,
    crossOriginIsolated:
      typeof self !== 'undefined' && self.crossOriginIsolated === true,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
  };
}

let sessionPromise: Promise<InferenceSession> | undefined;

/**
 * 创建并缓存会话。刻意不设置 env.wasm.numThreads：把归一化留给 ort，
 * 这样 create 后读回的值就是运行时决定的生效线程数（未隔离环境应为 1）。
 * 注意 env 是全局单例、wasm 后端一次初始化：若本页此前已创建过 wasm 会话
 * （如先看过「第一次推理」的实例），这里的读数会反映先前配置的值。
 */
export function loadSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    env.wasm.wasmPaths = WASM_CDN;
    sessionPromise = InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      // 失败后清空缓存，让下一次交互可以重新创建会话。
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

/** 从 performance 资源记录里提取实际拉取过的 ort-wasm 工件文件名。 */
export function loadedArtifacts(): string {
  const names = new Set<string>();
  for (const entry of performance.getEntriesByType('resource')) {
    const match = entry.name.match(/ort-wasm-[a-z.-]+\.(?:wasm|mjs)/);
    if (match) {
      names.add(match[0]);
    }
  }
  return [...names].sort().join(' · ') || '—';
}

/** 用空输入跑一次推理并计时：证明检测到的形态真实在执行。 */
export async function runOnce(session: InferenceSession): Promise<number> {
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: new Tensor(
      'float32',
      new Float32Array(1 * 1 * 28 * 28),
      [1, 1, 28, 28],
    ),
  };
  const start = performance.now();
  await session.run(feeds);
  return performance.now() - start;
}

export interface WasmFormsSnapshot {
  status: 'loading' | 'ready' | 'error';
  message: string;
  fixedSimd: string;
  relaxedSimd: string;
  sharedThreads: string;
  isolated: string;
  cores: string;
  threadsBefore: string;
  threadsAfter: string;
  artifacts: string;
  inference: string;
  simdActive: boolean;
  multiThreadActive: boolean;
}

export interface WasmFormsInstance {
  update(): void;
  dispose(): void;
}

export function createWasmForms(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WasmFormsSnapshot) => void,
): WasmFormsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  const probe = probeEnvironment();
  const threadsBeforeValue = env.wasm.numThreads;

  let status: WasmFormsSnapshot['status'] = 'loading';
  let message = '检测环境并创建会话…';
  let threadsAfterValue: number | undefined;
  let artifacts = '—';
  let inferenceMs: number | null = null;
  let layoutWidth = 0;

  function emitSnapshot() {
    const threadsAfter =
      typeof threadsAfterValue === 'number' ? String(threadsAfterValue) : '—';
    emit({
      status,
      message,
      fixedSimd: probe.fixedSimd ? '支持' : '不支持',
      relaxedSimd: probe.relaxedSimd ? '支持' : '不支持',
      sharedThreads: probe.sharedThreads ? '可用' : '不可用',
      isolated: probe.crossOriginIsolated ? '是' : '否',
      cores:
        probe.hardwareConcurrency !== null
          ? `${probe.hardwareConcurrency}`
          : '—',
      threadsBefore:
        typeof threadsBeforeValue === 'number' ? String(threadsBeforeValue) : '未设置',
      threadsAfter,
      artifacts,
      inference: inferenceMs !== null ? `${inferenceMs.toFixed(1)} ms` : '—',
      simdActive: probe.fixedSimd,
      multiThreadActive: (threadsAfterValue ?? 1) > 1,
    });
  }

  interface CardState {
    title: string;
    active: boolean;
    lines: string[];
  }

  function drawCard(x: number, y: number, width: number, height: number, card: CardState) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle = card.active ? '#eef3ff' : '#f4f6fa';
    ctx.fill();
    ctx.strokeStyle = card.active ? '#4f7cff' : '#dbe2ec';
    ctx.lineWidth = card.active ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(card.title, x + 14, y + 26);

    const badge = card.active ? '生效' : '未生效';
    const badgeWidth = 44;
    ctx.beginPath();
    ctx.roundRect(x + width - badgeWidth - 12, y + 12, badgeWidth, 20, 10);
    ctx.fillStyle = card.active ? '#4f7cff' : '#e2e8f0';
    ctx.fill();
    ctx.fillStyle = card.active ? '#ffffff' : '#64748b';
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, x + width - badgeWidth / 2 - 12, y + 26);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    card.lines.forEach((line, index) => {
      ctx.fillText(line, x + 14, y + 52 + index * 19);
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(520, size.width);
    const height = Math.max(236, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    layoutWidth = width;

    const margin = 28;
    const gap = 14;
    const cardTop = 22;
    const cardHeight = 108;
    const cardWidth = (width - margin * 2 - gap * 2) / 3;
    const singleThread = status === 'ready' && !(threadsAfterValue !== undefined && threadsAfterValue > 1);
    const multiThread = status === 'ready' && threadsAfterValue !== undefined && threadsAfterValue > 1;

    drawCard(margin, cardTop, cardWidth, cardHeight, {
      title: 'SIMD 向量加速',
      active: probe.fixedSimd,
      lines: [
        `固定宽度 ${probe.fixedSimd ? '支持' : '不支持'}`,
        `relaxed ${probe.relaxedSimd ? '支持' : '不支持'}`,
      ],
    });
    drawCard(margin + cardWidth + gap, cardTop, cardWidth, cardHeight, {
      title: '单线程',
      active: singleThread,
      lines: [
        `numThreads = ${threadsAfterValue ?? '—'}`,
        '推理在 JS 主线程执行',
      ],
    });
    drawCard(margin + (cardWidth + gap) * 2, cardTop, cardWidth, cardHeight, {
      title: '多线程',
      active: multiThread,
      lines: probe.crossOriginIsolated
        ? [`numThreads = ${threadsAfterValue ?? '—'}`, '跨域隔离已开启']
        : ['需要跨域隔离', 'crossOriginIsolated = 否'],
    });

    const conclusionY = cardTop + cardHeight + 40;
    if (status === 'error') {
      ctx.fillStyle = '#991b1b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`加载失败：${message}`, margin, conclusionY - 14);
      ctx.fillStyle = '#b45309';
      ctx.fillText('点击画布可重试；请检查网络与 wasmPaths 版本（onnxruntime-web@1.30.0）', margin, conclusionY + 8);
    } else if (status === 'ready') {
      const artifactName = artifacts.split(' · ').find((name) => name.endsWith('.wasm')) ?? '—';
      const threadsNote = multiThread ? `多线程 × ${threadsAfterValue}` : '单线程';
      const simdNote = probe.fixedSimd ? 'SIMD' : '无 SIMD';
      ctx.fillStyle = '#172033';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`当前形态：${threadsNote} + ${simdNote}`, margin, conclusionY - 14);
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`工件 ${artifactName} · 空输入 1 次 run ${inferenceMs?.toFixed(1) ?? '—'} ms`, margin, conclusionY + 8);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(message, margin, conclusionY - 14);
    }

    emitSnapshot();
  }

  async function run() {
    status = 'loading';
    message = '检测环境并创建会话…';
    draw();
    try {
      const session = await loadSession();
      const elapsed = await runOnce(session);
      // 第一次 create 之后读回：wasm 后端初始化时已完成 numThreads 归一化。
      threadsAfterValue = env.wasm.numThreads;
      artifacts = loadedArtifacts();
      inferenceMs = elapsed;
      status = 'ready';
      message = '就绪';
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
    }
    draw();
  }

  function onClick() {
    if (status === 'error') {
      void run();
    }
  }

  canvas.style.cursor = 'default';
  canvas.addEventListener('click', onClick);

  const resizeObserver = createResizeObserver(canvas, draw);

  draw();
  void run();

  return {
    update() {
      // 形态由环境决定，本实例没有 args；保留空实现以适配共享外壳。
    },
    dispose() {
      canvas.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      // 不释放共享会话：同一页面里其他内嵌实例可能仍在使用；释放策略见「内存管理」课程。
    },
  };
}
