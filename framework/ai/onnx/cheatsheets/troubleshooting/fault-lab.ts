/**
 * 范例外壳：把十档故障的「真实报错现场」画成四阶段流水线——① 取 ort-wasm 工件 →
 * ② create 会话 → ③ run 推理 → ④ 输出检查，高亮中断点并回传统一读数。真正执行
 * ort 的代码在 fault-lab.worker.ts（Show code 展示的文件）：主线程只负责按档位
 * 派生全新 worker、丢弃过期结果、画流水线。
 *
 * 为什么放 worker：env 是页面级单例，wasm 后端一次性初始化且失败粘滞到刷新
 * （见「ort.env 全局配置」课程）。每次尝试都用全新 worker，十档故障才能反复注入，
 * 也不会毒化本页其他课程的推理实例；「把 ort 放进 worker」本身是 proxy 工作线程
 * 课程的主题，这里只借它做隔离容器。
 *
 * 前置状态：浏览器需能访问 jsDelivr（onnxruntime-web@1.30.0）与 ONNX Model Zoo 的
 * media 端点。操作：Controls 切换 fault，切换即终止旧 worker、派生新 worker 重跑。
 * 预期结果：加载/初始化/run 各档在对应阶段标红，读数给出报错原文；ep-fallback 档
 * 全程无报错但第②阶段带警告标记（控制台警告读数）；int8-zero 档四阶段全过、第④
 * 阶段标橙——输出最大绝对值为 0。报错文案各浏览器措辞不同，以读数实际输出为准。
 * 阅读主线：FAULT_OPTIONS（十档文案）→ startAttempt（派生 worker）→ classify
 * （四阶段状态）→ draw（流水线画板）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import type { AttemptResult, FaultId, OutcomeKind, StageId } from './fault-lab.worker';

export interface FaultArgs {
  fault: FaultId;
}

export interface FaultLabSnapshot {
  phase: 'running' | 'done';
  fault: FaultId;
  faultLabel: string;
  outcome: OutcomeKind | null;
  stage: StageId | null;
  errorText: string | null;
  warningText: string | null;
  wasmUrl: string | null;
  outputMaxAbs: number | null;
  durationMs: number | null;
}

export interface FaultLabInstance {
  update(args: FaultArgs): void;
  dispose(): void;
}

export const FAULT_OPTIONS: Array<{ id: FaultId; label: string }> = [
  { id: 'wasm-mjs-404', label: '加载 · .mjs 404（前缀不存在）' },
  { id: 'wasm-wasm-404', label: '加载 · .wasm 404 / 编译失败' },
  { id: 'ep-missing', label: '初始化 · 请求未注册的 EP' },
  { id: 'ep-fallback', label: '初始化 · EP 回退（警告 + 兜底）' },
  { id: 'feeds-missing', label: 'run · feeds 缺输入名' },
  { id: 'feeds-extra', label: 'run · feeds 多余键' },
  { id: 'feeds-not-tensor', label: 'run · feeds 值不是 Tensor' },
  { id: 'fetches-invalid', label: 'run · fetches 非法输出名' },
  { id: 'shape-rank', label: 'run · 输入形状与签名不符' },
  { id: 'int8-zero', label: '结果 · int8 变体输出恒零（不抛错）' },
];

function labelOf(id: FaultId): string {
  return FAULT_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

const STAGE_TITLES = ['① 取 ort-wasm 工件', '② create 会话', '③ run 推理', '④ 输出检查'];
const STAGE_SUBTITLES = [
  'ort-wasm-simd-threaded.jsep.*',
  'mnist-8.onnx · executionProviders',
  'feeds → session.run()',
  '输出 dims 与数值检查',
];

export const STAGE_LABELS: Record<StageId, string> = {
  load: STAGE_TITLES[0],
  create: STAGE_TITLES[1],
  run: STAGE_TITLES[2],
  result: STAGE_TITLES[3],
};

/** 长 URL/报错原文在只读面板里没有断行机会，插入零宽空格让它们可换行（内容不变）。 */
export function softWrap(text: string): string {
  return text.replace(/([/.:()-])/g, `$1\u200b`);
}

type StageState = 'idle' | 'active' | 'passed' | 'failed' | 'warned' | 'abnormal';

const STAGE_COLORS: Record<
  StageState,
  { fill: string; border: string; text: string; mark: string }
> = {
  idle: { fill: '#f4f6fa', border: '#dbe2ec', text: '#64748b', mark: '' },
  active: { fill: '#eef3ff', border: '#4f7cff', text: '#1d2b64', mark: '…' },
  passed: { fill: '#ecfdf5', border: '#15803d', text: '#14532d', mark: '✓' },
  failed: { fill: '#fef2f2', border: '#dc2626', text: '#7f1d1d', mark: '✕' },
  // warned：走通了但带着警告（静默回退）——绿底橙边，提示「别只看有没有报错」。
  warned: { fill: '#ecfdf5', border: '#ea580c', text: '#14532d', mark: '⚠' },
  // abnormal：链路全绿但结果不对——最危险的一类，用橙色单独标记。
  abnormal: { fill: '#fff7ed', border: '#ea580c', text: '#7c2d12', mark: '!' },
};

/** 四阶段各自的状态：失败点之前的已通过、失败点标红、之后的未到达。 */
function classify(snapshot: FaultLabSnapshot): StageState[] {
  if (snapshot.phase === 'running') {
    return ['active', 'idle', 'idle', 'idle'];
  }

  const outcome = snapshot.outcome;
  if (outcome === 'fallback-ok') {
    return ['passed', 'warned', 'passed', 'passed'];
  }
  if (outcome === 'wrong-result') {
    return ['passed', 'passed', 'passed', 'abnormal'];
  }

  const failedIndex = snapshot.stage === 'load' ? 0 : snapshot.stage === 'create' ? 1 : 2;
  return STAGE_TITLES.map((_, index) =>
    index < failedIndex ? 'passed' : index === failedIndex ? 'failed' : 'idle',
  );
}

export function createFaultLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FaultLabSnapshot) => void,
): FaultLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let fault: FaultId = 'wasm-mjs-404';
  let snapshot: FaultLabSnapshot = {
    phase: 'running',
    fault,
    faultLabel: labelOf(fault),
    outcome: null,
    stage: null,
    errorText: null,
    warningText: null,
    wasmUrl: null,
    outputMaxAbs: null,
    durationMs: null,
  };
  let worker: Worker | null = null;

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

  function outcomeText(): string {
    if (snapshot.phase === 'running') {
      return '进行中…';
    }
    if (snapshot.outcome === 'error') {
      return `中断于 ${snapshot.stage ? STAGE_LABELS[snapshot.stage] : '链路'}`;
    }
    if (snapshot.outcome === 'fallback-ok') {
      return '无报错——警告 + 兜底（会话照建）';
    }
    return '无报错——输出恒零（结果不对）';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(600, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 24;
    const gap = 30;
    const boxTop = 28;
    const boxHeight = 84;
    const boxWidth = (width - margin * 2 - gap * 3) / 4;

    const states = classify(snapshot);
    for (let index = 0; index < STAGE_TITLES.length; index += 1) {
      const x = margin + index * (boxWidth + gap);
      const colors = STAGE_COLORS[states[index]];

      ctx.beginPath();
      ctx.roundRect(x, boxTop, boxWidth, boxHeight, 8);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = states[index] === 'idle' ? 1 : 2;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = colors.text;
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(STAGE_TITLES[index], x + 12, boxTop + 24);

      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      // maxWidth 让过长的文件名在小画布里压缩显示，不裁掉尾部。
      ctx.fillText(STAGE_SUBTITLES[index], x + 12, boxTop + 48, boxWidth - 24);

      if (colors.mark) {
        ctx.font = '700 16px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(colors.mark, x + boxWidth - 12, boxTop + 26);
        ctx.textAlign = 'left';
      }

      if (index < STAGE_TITLES.length - 1) {
        drawArrow(x + boxWidth + 5, boxTop + boxHeight / 2, gap - 10);
      }
    }

    const infoY = boxTop + boxHeight + 36;
    ctx.textAlign = 'left';
    const infoColor =
      snapshot.phase === 'running'
        ? '#4f7cff'
        : snapshot.outcome === 'error'
          ? '#dc2626'
          : snapshot.outcome === 'wrong-result'
            ? '#ea580c'
            : '#b45309';
    ctx.fillStyle = infoColor;
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      snapshot.phase === 'running'
        ? `正在全新 worker 中注入「${snapshot.faultLabel}」…首次会下载约 27MB 的 .wasm，之后命中缓存`
        : outcomeText(),
      margin,
      infoY,
    );

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      '每次尝试都在全新 worker 里执行，切换档位即可重试；真实应用中失败会粘滞到页面刷新',
      margin,
      infoY + 22,
    );

    emit(snapshot);
  }

  function applyResult(result: AttemptResult) {
    snapshot = {
      phase: 'done',
      fault: result.fault,
      faultLabel: labelOf(result.fault),
      outcome: result.outcome,
      stage: result.stage,
      errorText: result.errorText,
      warningText: result.warnings[0] ?? null,
      wasmUrl: result.wasmUrl,
      outputMaxAbs: result.outputMaxAbs,
      durationMs: result.durationMs,
    };
    draw();
  }

  function startAttempt(next: FaultId) {
    fault = next;
    snapshot = {
      phase: 'running',
      fault: next,
      faultLabel: labelOf(next),
      outcome: null,
      stage: null,
      errorText: null,
      warningText: null,
      wasmUrl: null,
      outputMaxAbs: null,
      durationMs: null,
    };

    worker?.terminate();
    const nextWorker = new Worker(
      new URL('./fault-lab.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker = nextWorker;

    nextWorker.onmessage = (event: MessageEvent<AttemptResult & { fault: FaultId }>) => {
      if (event.data.fault !== fault || nextWorker !== worker) {
        return; // 丢弃过期结果
      }
      applyResult(event.data);
    };
    nextWorker.onerror = (event) => {
      if (nextWorker !== worker) {
        return;
      }
      applyResult({
        fault,
        stage: 'load',
        outcome: 'error',
        errorText: event.message || 'worker 加载失败',
        warnings: [],
        durationMs: 0,
        mjsUrl: null,
        wasmUrl: null,
        outputDims: null,
        outputMaxAbs: null,
      });
    };

    draw();
    nextWorker.postMessage({ fault: next });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();
  startAttempt(fault);

  return {
    update(args: FaultArgs) {
      if (args.fault !== fault) {
        startAttempt(args.fault);
      }
    },
    dispose() {
      worker?.terminate();
      worker = null;
      resizeObserver.disconnect();
    },
  };
}
