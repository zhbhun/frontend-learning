/**
 * 范例外壳：把五种 wasmPaths 配置的「真实 create 现场」画成三阶段流水线，
 * 高亮中断点并回传统一读数。真正执行 ort 的代码在 path-attempt.worker.ts
 * （Show code 展示的文件）：主线程只负责按档位派生全新 worker、接收结果、画中断阶段。
 *
 * 为什么放 worker：env 是页面级单例，wasm 后端只初始化一次且失败粘滞到刷新
 * （见「env 标志与生命周期」课程）。每个尝试都用全新 worker，正确与错误档位才能
 * 反复运行，也不会毒化本页其他课程的推理实例；「把 ort 放进 worker」本身是
 * proxy 工作线程课程的主题，这里只借它做隔离容器。
 *
 * 前置状态：浏览器需能访问 jsDelivr（onnxruntime-web@1.30.0）与 MNIST 模型。
 * 操作：Controls 切换 branch，切换即终止旧 worker、派生新 worker 重跑。
 * 预期结果：cdn / object 档三阶段全绿，读数列出实际拉取的工件 URL；
 * none 档中断在第②阶段（.mjs 是内嵌的，.wasm 404）；bad-prefix 中断在第①阶段，
 * 报错原文含拼出的完整 .mjs URL；bad-wasm 中断在第②阶段。中断阶段按报错原文
 * 与 worker 资源记录判定，个别浏览器不为动态 import 记录资源时以报错原文为准。
 * 阅读主线：startAttempt（派生 worker）→ classify（判定中断阶段）→ draw（流水线画板）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import type { AttemptResult, BranchId } from './path-attempt.worker';

export interface PathAttemptArgs {
  branch: BranchId;
}

export interface PathAttemptSnapshot {
  phase: 'running' | 'ok' | 'error';
  branch: BranchId;
  branchLabel: string;
  mjsUrl: string;
  wasmUrl: string;
  errorText: string;
  durationMs: number | null;
}

export interface PathAttemptInstance {
  update(args: PathAttemptArgs): void;
  dispose(): void;
}

/** Controls 与画布共用的档位文案。 */
export const BRANCH_OPTIONS: Array<{ id: BranchId; label: string }> = [
  { id: 'cdn', label: 'CDN 前缀（正确）' },
  { id: 'object', label: '对象形式（正确）' },
  { id: 'none', label: '不设置（打包器默认）' },
  { id: 'bad-prefix', label: '前缀不存在（.mjs 404）' },
  { id: 'bad-wasm', label: '仅 .wasm 路径错误' },
];

function labelOf(id: BranchId): string {
  return BRANCH_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

/** 长 URL/报错原文在只读面板里没有断行机会，插入零宽空格让它们可换行（内容不变）。 */
export function softWrap(text: string): string {
  return text.replace(/([/.-])/g, `$1\u200b`);
}

type StageState = 'idle' | 'active' | 'passed' | 'failed';

const STAGE_COLORS: Record<
  StageState,
  { fill: string; border: string; text: string; mark: string }
> = {
  idle: { fill: '#f4f6fa', border: '#dbe2ec', text: '#64748b', mark: '' },
  active: { fill: '#eef3ff', border: '#4f7cff', text: '#1d2b64', mark: '…' },
  passed: { fill: '#ecfdf5', border: '#15803d', text: '#14532d', mark: '✓' },
  failed: { fill: '#fef2f2', border: '#dc2626', text: '#7f1d1d', mark: '✕' },
};

export function createPathAttempt(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PathAttemptSnapshot) => void,
): PathAttemptInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let branch: BranchId = 'cdn';
  let phase: PathAttemptSnapshot['phase'] = 'running';
  let mjsUrl = '';
  let wasmUrl = '';
  let errorText = '';
  let durationMs: number | null = null;
  let worker: Worker | null = null;

  function emitSnapshot() {
    emit({
      phase,
      branch,
      branchLabel: labelOf(branch),
      mjsUrl,
      wasmUrl,
      errorText,
      durationMs,
    });
  }

  /**
   * 判定三阶段（取 .mjs 加载器 → 取并编译 .wasm → create 会话）的各自状态。
   * 依据是直接观察：报错原文是否提到 .mjs、worker 资源记录里是否出现过 .mjs URL。
   * none 档的加载器是 bundle 内嵌的，不发起网络请求，中断只能发生在 .wasm。
   */
  function classify(): [StageState, StageState, StageState] {
    if (phase === 'ok') {
      return ['passed', 'passed', 'passed'];
    }
    if (phase === 'running') {
      return ['active', 'idle', 'idle'];
    }
    if (errorText.includes('.mjs')) {
      return ['failed', 'idle', 'idle'];
    }
    if (branch === 'none' || mjsUrl) {
      return ['passed', 'failed', 'idle'];
    }
    return ['failed', 'idle', 'idle'];
  }

  function drawStage(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    subtitle: string,
    state: StageState,
  ) {
    const colors = STAGE_COLORS[state];
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = state === 'idle' ? 1 : 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.text;
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, x + 12, y + 24);

    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    // maxWidth 让过长的文件名在小画布里压缩显示，不裁掉尾部。
    ctx.fillText(subtitle, x + 12, y + 48, width - 24);

    if (colors.mark) {
      ctx.font = '700 16px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(colors.mark, x + width - 12, y + 26);
      ctx.textAlign = 'left';
    }
  }

  function drawArrow(x: number, y: number, length: number) {
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + length, y);
    ctx.lineTo(x + length - 6, y - 4);
    ctx.lineTo(x + length - 6, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(236, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 24;
    const gap = 34;
    const boxTop = 28;
    const boxHeight = 84;
    const boxWidth = (width - margin * 2 - gap * 2) / 3;

    const states = classify();
    const titles = ['① 取 .mjs 加载器', '② 取并编译 .wasm', '③ create 会话'];
    const subtitles = [
      branch === 'none' ? '（bundle 内嵌，无需网络）' : 'ort-wasm-simd-threaded.jsep.mjs',
      'ort-wasm-simd-threaded.jsep.wasm',
      'mnist-8.onnx',
    ];
    for (let index = 0; index < 3; index += 1) {
      const x = margin + index * (boxWidth + gap);
      drawStage(x, boxTop, boxWidth, boxHeight, titles[index], subtitles[index], states[index]);
      if (index < 2) {
        drawArrow(x + boxWidth + 5, boxTop + boxHeight / 2, gap - 10);
      }
    }

    const infoY = boxTop + boxHeight + 36;
    ctx.textAlign = 'left';
    if (phase === 'running') {
      ctx.fillStyle = '#4f7cff';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `正在创建会话（${labelOf(branch)}）…正确档位首次会下载约 27MB 的 .wasm`,
        margin,
        infoY,
      );
    } else if (phase === 'ok') {
      ctx.fillStyle = '#15803d';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`create 成功，用时 ${(durationMs ?? 0).toFixed(0)} ms`, margin, infoY);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('create 失败：报错原文见左下读数', margin, infoY);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      phase === 'error'
        ? '每次尝试都在全新 worker 里执行，切换档位即可重试；真实应用中失败会粘滞到页面刷新'
        : '实际 URL = 你配置的位置 + 入口内嵌的文件名，两段都能在读数与 Network 面板里对上',
      margin,
      infoY + 22,
    );

    emitSnapshot();
  }

  function startAttempt(next: BranchId) {
    branch = next;
    phase = 'running';
    mjsUrl = '';
    wasmUrl = '';
    errorText = '';
    durationMs = null;

    worker?.terminate();
    const nextWorker = new Worker(
      new URL('./path-attempt.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker = nextWorker;

    nextWorker.onmessage = (event: MessageEvent<AttemptResult & { branch: BranchId }>) => {
      if (event.data.branch !== branch || nextWorker !== worker) {
        return; // 丢弃过期结果
      }
      phase = event.data.ok ? 'ok' : 'error';
      mjsUrl = event.data.mjsUrl ?? '';
      wasmUrl = event.data.wasmUrl ?? '';
      errorText = event.data.errorText ?? '';
      durationMs = event.data.durationMs;
      draw();
    };
    nextWorker.onerror = (event) => {
      if (nextWorker !== worker) {
        return;
      }
      phase = 'error';
      errorText = event.message || 'worker 加载失败';
      draw();
    };

    draw();
    nextWorker.postMessage({ branch: next });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();
  startAttempt(branch);

  return {
    update(args: PathAttemptArgs) {
      if (args.branch !== branch) {
        startAttempt(args.branch);
      }
    },
    dispose() {
      worker?.terminate();
      worker = null;
      resizeObserver.disconnect();
    },
  };
}
