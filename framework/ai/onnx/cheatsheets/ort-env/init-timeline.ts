/**
 * 范例：首次 InferenceSession.create 前后对照 ort.env.wasm，观察标志的读取、
 * 自动解析与回写，以及 numThreads 无法生效时 ort 自己给出的回落警告原文。
 * 前置状态：浏览器需能访问 ort wasm 的 CDN（默认入口的 JSEP 工件约 28MB，仅首次）
 * 与 MNIST 模型（约 26KB，ONNX Model Zoo 的 Git LFS 端点），均运行时拉取、不进仓库。
 * 操作：用「numThreads 设置值」选择 auto(0)/1/2；wasm 在本页只初始化一次，
 * 切换选项不会重演初始化（正文所讲的「一次性」），刷新页面可重做实验。
 * 预期结果：非跨域隔离页面选 2 时，读数出现 ort 的两条回落警告，实际线程数
 * 回写为 1；选 auto 与 1 同样得到 1。create 耗时首次包含 wasm 下载与初始化。
 * 阅读主线：runOnce() 如何在 create 前后采样 env 并临时捕获 console.warn；
 * 画布时间线与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession } from 'onnxruntime-web';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/** ONNX Model Zoo 的 MNIST 模型（约 26KB），走 Git LFS 的 media 端点。 */
const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

export type ThreadsChoice = 'auto' | '1' | '2';

/** Controls 里显示的选项名。 */
export const THREADS_LABELS: Record<ThreadsChoice, string> = {
  auto: 'auto（0，交给 ort 决定）',
  '1': '1（显式单线程）',
  '2': '2（隔离不足时会被回落）',
};

function formatThreads(value: unknown): string {
  return value === undefined ? '未设置（自动）' : String(value);
}

export interface InitTimelineData {
  rows: Array<[string, string]>;
  phase: 'creating' | 'done' | 'failed';
  message: string;
  choice: ThreadsChoice;
  before: {
    /** 创建前 env.wasm.numThreads 的读数。 */
    numThreads: string;
    /** 初始化是否已发生过（本页或其他课程先创建了会话）。 */
    preInitialized: boolean;
    isolated: boolean;
    cores: number;
  };
  after: {
    numThreads: string;
    wasmPaths: string;
    durationMs: number | null;
    warnings: string[];
    io: string;
  } | null;
}

export interface InitTimelineOptions {
  threads: ThreadsChoice;
}

export interface InitTimelineInstance {
  update(options: InitTimelineOptions): void;
  dispose(): void;
}

const COLOR_TEXT = '#172033';
const COLOR_MUTED = '#475569';
const COLOR_FADED = '#94a3b8';
const COLOR_ACCENT = '#4f7cff';
const COLOR_WARN = '#b45309';

export function createInitTimeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InitTimelineData) => void,
): InitTimelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let latest: InitTimelineData = {
    rows: [],
    phase: 'creating',
    message: '等待首次创建…',
    choice: 'auto',
    before: {
      numThreads: '—',
      preInitialized: false,
      isolated: false,
      cores: 1,
    },
    after: null,
  };
  let started = false;
  let inFlight = false;

  function wrapText(text: string, maxWidth: number, maxLines: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length >= maxLines) {
          break;
        }
      } else {
        line += char;
      }
    }
    if (lines.length < maxLines && line) {
      lines.push(line);
    }
    return lines;
  }

  function drawPanel(
    x: number,
    y: number,
    width: number,
    title: string,
    items: Array<[string, string]>,
  ) {
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, x, y + 14);

    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    let rowY = y + 40;
    for (const [name, value] of items) {
      ctx.fillStyle = COLOR_MUTED;
      ctx.fillText(name, x, rowY);
      ctx.fillStyle = COLOR_TEXT;
      const lines = wrapText(value, width - 130, 2);
      lines.forEach((line, index) => {
        ctx.fillText(line, x + 126, rowY + index * 15);
      });
      rowY += 18 + (lines.length - 1) * 15;
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(620, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('首次 InferenceSession.create：标志被读取与回写', 28, 38);

    const columnWidth = (width - 84) / 2;

    const beforeItems: Array<[string, string]> = [
      ['numThreads 设置值', THREADS_LABELS[latest.choice]],
      ['numThreads 当时读数', latest.before.numThreads],
      [
        'wasmPaths',
        latest.before.preInitialized
          ? '（复用既有运行时，不改写）'
          : WASM_CDN,
      ],
      ['crossOriginIsolated', String(latest.before.isolated)],
      ['逻辑核数', String(latest.before.cores)],
    ];
    drawPanel(28, 58, columnWidth, '创建前（我们设置的输入）', beforeItems);

    if (latest.after) {
      const afterItems: Array<[string, string]> = [
        ['numThreads 实际值（回写）', latest.after.numThreads],
        ['create 耗时', latest.after.durationMs != null ? `${latest.after.durationMs} ms` : '—'],
        ['会话 I/O', latest.after.io],
        [
          'ort 警告',
          latest.after.warnings.length > 0
            ? `${latest.after.warnings.length} 条：`
            : '无',
        ],
      ];
      drawPanel(28 + columnWidth + 56, 58, columnWidth, '创建后（ort 生效并回写）', afterItems);

      // 警告原文是「设置未生效」的第一手证据，单独成块展示。
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      let warnY = 58 + 40 + beforeItems.length * 18 + 22;
      ctx.fillStyle = COLOR_WARN;
      ctx.fillText('console.warn 原文：', 28 + columnWidth + 56, warnY);
      warnY += 17;
      latest.after.warnings.slice(0, 2).forEach((warning) => {
        wrapText(warning, columnWidth + 20, 2).forEach((line) => {
          ctx.fillText(line, 28 + columnWidth + 56, warnY);
          warnY += 14;
        });
        warnY += 4;
      });
    } else if (latest.phase === 'failed') {
      ctx.fillStyle = '#991b1b';
      ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(`失败：${latest.message}`, columnWidth + 40, 3).forEach(
        (line, index) => {
          ctx.fillText(line, 28 + columnWidth + 56, 100 + index * 17);
        },
      );
      ctx.fillStyle = COLOR_WARN;
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        '初始化失败不可重试，刷新页面后重新实验',
        28 + columnWidth + 56,
        168,
      );
    } else {
      ctx.fillStyle = COLOR_FADED;
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(latest.message, 28 + columnWidth + 56, 110);
    }

    // 中间的箭头标注「一次性」语义。
    const centerX = 28 + columnWidth + 28;
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('→', centerX - 5, 150);
    ctx.fillStyle = COLOR_MUTED;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('一次性', centerX - 14, 166);

    ctx.fillStyle = COLOR_FADED;
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      'wasm 只初始化一次：切换选项不会重演本实验，刷新页面可重做',
      28,
      height - 18,
    );

    emit(latest);
  }

  async function runOnce(choice: ThreadsChoice) {
    inFlight = true;
    const isolated =
      typeof self !== 'undefined' && self.crossOriginIsolated === true;
    const cores =
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1;
    const numThreadsBefore = env.wasm.numThreads;
    // numThreads 已被回写成具体数字，说明初始化发生过——公开判据。
    const preInitialized =
      typeof numThreadsBefore === 'number' && numThreadsBefore > 0;

    // 临时包装 console.warn：ort 的回落警告是「设置未生效」的第一手证据。
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((item) => String(item)).join(' '));
      originalWarn.apply(console, args);
    };

    const makeBefore = () => ({
      numThreads: formatThreads(numThreadsBefore),
      preInitialized,
      isolated,
      cores,
    });

    latest = {
      rows: [],
      phase: 'creating',
      message: preInitialized
        ? '检测到 wasm 已初始化，本次创建复用既有运行时…'
        : '加载 wasm 工件与模型…',
      choice,
      before: makeBefore(),
      after: null,
    };
    draw();

    try {
      // env 的设置窗口：第一个会话之前。已初始化时写入也不会再被读取。
      if (!preInitialized) {
        env.wasm.wasmPaths = WASM_CDN;
        env.wasm.numThreads = choice === 'auto' ? 0 : Number(choice);
      }

      const startedAt = performance.now();
      const session = await InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
      });
      const durationMs = Math.round(performance.now() - startedAt);

      latest = {
        rows: [
          ['状态', preInitialized ? '完成（复用已初始化的 wasm）' : '完成'],
          ['numThreads 设置值', THREADS_LABELS[choice]],
          ['numThreads 实际值', formatThreads(env.wasm.numThreads)],
          [
            'ort 警告',
            warnings.length > 0 ? `${warnings.length} 条（原文见画布）` : '无',
          ],
          ['crossOriginIsolated', String(isolated)],
          ['create 耗时', `${durationMs} ms`],
          ['会话 I/O', `${session.inputNames[0]} → ${session.outputNames[0]}`],
        ],
        phase: 'done',
        message: preInitialized
          ? '完成（复用已初始化的 wasm，标志不再被读取）'
          : '完成——右栏是 ort 实际生效并回写的值',
        choice,
        before: makeBefore(),
        after: {
          numThreads: formatThreads(env.wasm.numThreads),
          wasmPaths: String(env.wasm.wasmPaths),
          durationMs,
          warnings,
          io: `${session.inputNames[0]} → ${session.outputNames[0]}`,
        },
      };
    } catch (error) {
      latest = {
        rows: [
          ['状态', '失败'],
          ['错误', error instanceof Error ? error.message : String(error)],
          ['ort 警告', warnings.length > 0 ? `${warnings.length} 条` : '无'],
        ],
        phase: 'failed',
        message: error instanceof Error ? error.message : String(error),
        choice,
        before: makeBefore(),
        after: {
          numThreads: formatThreads(env.wasm.numThreads),
          wasmPaths: String(env.wasm.wasmPaths),
          durationMs: null,
          warnings,
          io: '—',
        },
      };
    } finally {
      console.warn = originalWarn;
      inFlight = false;
    }
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, () => draw());

  return {
    update(options) {
      if (inFlight) {
        return; // 创建进行中，忽略并发切换。
      }
      if (!started) {
        started = true;
        latest = { ...latest, choice: options.threads };
        draw();
        void runOnce(options.threads);
        return;
      }
      // 一次性语义：初始化已经发生过，切换只更新选项显示。
      latest = { ...latest, choice: options.threads };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
