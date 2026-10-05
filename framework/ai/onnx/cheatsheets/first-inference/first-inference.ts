/**
 * 范例：第一次推理的最小闭环——加载 MNIST 模型创建会话，把画板笔画构造成
 * [1,1,28,28] float32 输入张量，执行 session.run 并读取输出层 10 个类别的分数。
 * 前置状态：浏览器需能访问模型文件与 ort wasm 的 CDN；模型约 26KB，运行时从
 * ONNX Model Zoo 的 Git LFS 端点拉取，不进仓库；首次运行还需下载 wasm 运行时。
 * 操作：在左侧画板按住鼠标画一个数字（0-9），点「清空」可重画；加载失败时点击
 * 画板可重试。
 * 预期结果：右侧出现 10 个类别的分数条，读数显示从会话读取的输入/输出签名与预测。
 * 阅读主线：loadSession（配置 env → create）→ runDigit（构造张量 → run → 读输出）；
 * 画板与分数条属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

/**
 * ONNX Model Zoo 的 MNIST 模型（约 26KB）。
 * 注意模型文件走 Git LFS：raw.githubusercontent.com 只返回指针文本，
 * 浏览器 fetch 要用 GitHub 的 media 端点（响应带 Access-Control-Allow-Origin: *）。
 */
export const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
export const WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

const GRID = 28;
const CLASS_COUNT = 10;

export interface RunResult {
  inputName: string;
  inputDims: ReadonlyArray<number | string>;
  outputName: string;
  outputDims: readonly number[];
  probs: number[];
  predicted: number;
}

let sessionPromise: Promise<InferenceSession> | undefined;

/**
 * 创建并缓存会话。env 的 wasm 标志必须在第一个会话创建之前设置，之后修改不再
 * 生效；会话创建是重操作，这里只创建一次，后续所有 run 复用同一个会话。
 */
export function loadSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    env.wasm.wasmPaths = WASM_CDN;
    // 工作区没有 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    env.wasm.numThreads = 1;
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

/** 跑一次完整推理：按模型签名构造张量 → run → 读取输出。 */
export async function runDigit(grid: Float32Array): Promise<RunResult> {
  const session = await loadSession();

  // feeds 的键必须逐字等于模型的输入名，形状必须与模型签名一致。
  const feeds: InferenceSession.FeedsType = {
    [session.inputNames[0]]: new Tensor('float32', grid, [1, 1, GRID, GRID]),
  };

  const outputs = await session.run(feeds);

  // 返回值按输出名索引；wasm 后端的输出在 CPU，.data 同步可读。
  const outputName = session.outputNames[0];
  const output = outputs[outputName] as Tensor | undefined;
  if (!output) {
    throw new Error(`输出 ${outputName} 不存在。`);
  }
  const logits = output.data as Float32Array;

  // 模型输出是 softmax 之前的分数：argmax 直接得到预测，softmax 把分数变成概率。
  const max = Math.max(...logits);
  const exps = Array.from(logits, (value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);

  const inputMetadata = session.inputMetadata[0];

  return {
    inputName: session.inputNames[0],
    inputDims: inputMetadata && inputMetadata.isTensor ? [...inputMetadata.shape] : [],
    outputName,
    outputDims: [...output.dims],
    probs: exps.map((value) => value / sum),
    predicted: logits.indexOf(max),
  };
}

export interface FirstInferenceSnapshot {
  status: 'loading' | 'running' | 'ready' | 'error';
  message: string;
  inputDesc: string;
  outputDesc: string;
  prediction: string;
  scores: number[];
}

export interface FirstInferenceInstance {
  update(): void;
  dispose(): void;
}

interface Layout {
  width: number;
  height: number;
  padX: number;
  padY: number;
  padSize: number;
}

const BRUSH_CELLS = 1.8;
const DEBOUNCE_MS = 140;

export function createFirstInference(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FirstInferenceSnapshot) => void,
): FirstInferenceInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let grid = new Float32Array(GRID * GRID);
  let result: RunResult | null = null;
  let status: FirstInferenceSnapshot['status'] = 'loading';
  let message = '加载模型…';
  let layout: Layout = { width: 0, height: 0, padX: 0, padY: 0, padSize: 0 };
  let chip: { x: number; y: number } | null = null;
  let drawing = false;
  let lastPoint: { x: number; y: number } | null = null;
  let debounceId = 0;
  let runToken = 0;

  function emitSnapshot() {
    emit({
      status,
      message,
      inputDesc: result
        ? `${result.inputName} [${result.inputDims.join(',')}]`
        : '—',
      outputDesc: result ? `${result.outputName} [${result.outputDims.join(',')}]` : '—',
      prediction: result
        ? `${result.predicted}（概率 ${result.probs[result.predicted].toFixed(2)}）`
        : '—',
      scores: result ? result.probs : [],
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padSize = Math.min(height - 104, width / 2 - 72);
    const padX = 28;
    const padY = Math.max(44, (height - padSize - 34) / 2);
    layout = { width, height, padX, padY, padSize };

    drawPad(padX, padY, padSize);
    drawBars(width / 2 + 32, 52, width / 2 - 56, height - 84);

    if (status === 'error') {
      drawError(width, height);
    }
    emitSnapshot();
  }

  function drawPad(x: number, y: number, size: number) {
    ctx.fillStyle = '#101820';
    ctx.fillRect(x, y, size, size);

    const cell = size / GRID;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * cell, y);
      ctx.lineTo(x + i * cell, y + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + i * cell);
      ctx.lineTo(x + size, y + i * cell);
      ctx.stroke();
    }

    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const value = grid[row * GRID + col];
        if (value > 0) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, value).toFixed(3)})`;
          ctx.fillRect(x + col * cell, y + row * cell, cell + 0.5, cell + 0.5);
        }
      }
    }

    chip = { x: x + size - 60, y: y + size + 10 };
    ctx.beginPath();
    ctx.roundRect(chip.x, chip.y, 60, 24, 5);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('清空', chip.x + 30, chip.y + 16);
    ctx.textAlign = 'left';
  }

  function drawBars(x: number, y: number, width: number, height: number) {
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('输出层分数（softmax 后）', x, y - 12);

    if (result) {
      const current = result;
      const rowHeight = height / CLASS_COUNT;
      const barX = x + 22;
      const barWidth = width - 92;
      for (let i = 0; i < CLASS_COUNT; i += 1) {
        const rowY = y + i * rowHeight;
        const isPredicted = i === current.predicted;
        ctx.fillStyle = isPredicted ? '#4f7cff' : '#94a3b8';
        ctx.font = `${isPredicted ? '700' : '400'} 12px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillText(String(i), x, rowY + rowHeight / 2 + 4);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(barX, rowY + rowHeight / 2 - 7, barWidth, 14);
        ctx.fillStyle = isPredicted ? '#4f7cff' : '#b3bfd0';
        ctx.fillRect(barX, rowY + rowHeight / 2 - 7, Math.max(2, current.probs[i] * barWidth), 14);

        ctx.fillStyle = '#475569';
        ctx.textAlign = 'right';
        ctx.fillText(current.probs[i].toFixed(2), x + width, rowY + rowHeight / 2 + 4);
        ctx.textAlign = 'left';
      }
      return;
    }

    ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(status === 'error' ? '加载失败，点击画板重试' : message, x + 4, y + height / 2);
  }

  function drawError(width: number, height: number) {
    const boxX = width / 2 + 32;
    const boxY = height / 2 - 4;
    const boxWidth = width / 2 - 64;
    const lines = wrapText(`加载失败：${message}`, boxWidth - 28);
    const boxHeight = Math.min(120, 26 + lines.length * 19 + 20);

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fillStyle = '#fff5f5';
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    lines.forEach((line, index) => {
      ctx.fillText(line, boxX + 14, boxY + 24 + index * 19);
    });
    ctx.fillStyle = '#b45309';
    ctx.fillText('点击画板可重试；请检查网络与 wasmPaths 版本（onnxruntime-web@1.30.0）', boxX + 14, boxY + boxHeight - 8);
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length >= 3) {
          break;
        }
      } else {
        line += char;
      }
    }
    if (lines.length < 3 && line) {
      lines.push(line);
    }
    return lines;
  }

  function stagePoint(event: PointerEvent): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !layout.width) {
      return null;
    }
    return {
      x: (event.clientX - rect.left) * (layout.width / rect.width),
      y: (event.clientY - rect.top) * (layout.height / rect.height),
    };
  }

  function stamp(centerX: number, centerY: number) {
    const cell = layout.padSize / GRID;
    const cx = (centerX - layout.padX) / cell;
    const cy = (centerY - layout.padY) / cell;
    if (cx < -BRUSH_CELLS || cy < -BRUSH_CELLS || cx > GRID + BRUSH_CELLS || cy > GRID + BRUSH_CELLS) {
      return;
    }
    for (let row = Math.max(0, Math.floor(cy - BRUSH_CELLS)); row <= Math.min(GRID - 1, Math.ceil(cy + BRUSH_CELLS)); row += 1) {
      for (let col = Math.max(0, Math.floor(cx - BRUSH_CELLS)); col <= Math.min(GRID - 1, Math.ceil(cx + BRUSH_CELLS)); col += 1) {
        const distance = Math.hypot(col + 0.5 - cx, row + 0.5 - cy);
        const value = Math.max(0, 1 - distance / (BRUSH_CELLS * 0.95));
        const index = row * GRID + col;
        if (value > grid[index]) {
          grid[index] = Math.min(1, value);
        }
      }
    }
  }

  function stampLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const cell = layout.padSize / GRID;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (cell * 0.5)));
    for (let i = 0; i <= steps; i += 1) {
      stamp(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    }
  }

  function scheduleRun() {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      void run();
    }, DEBOUNCE_MS);
  }

  async function run() {
    const token = ++runToken;
    status = 'running';
    message = '推理中…';
    draw();
    try {
      const next = await runDigit(grid);
      if (token !== runToken) {
        return;
      }
      result = next;
      status = 'ready';
      message = '就绪';
    } catch (error) {
      if (token !== runToken) {
        return;
      }
      status = 'error';
      message = error instanceof Error ? error.message : String(error);
      result = null;
    }
    draw();
  }

  function onPointerDown(event: PointerEvent) {
    canvas.setPointerCapture(event.pointerId);
    const point = stagePoint(event);
    if (!point) {
      return;
    }
    if (chip && point.x >= chip.x && point.x <= chip.x + 60 && point.y >= chip.y && point.y <= chip.y + 24) {
      grid = new Float32Array(GRID * GRID);
      drawing = false;
      draw();
      scheduleRun();
      return;
    }
    if (status === 'error') {
      scheduleRun();
      return;
    }
    drawing = true;
    lastPoint = point;
    stamp(point.x, point.y);
    draw();
    scheduleRun();
  }

  function onPointerMove(event: PointerEvent) {
    if (!drawing) {
      return;
    }
    const point = stagePoint(event);
    if (!point) {
      return;
    }
    if (lastPoint) {
      stampLine(lastPoint, point);
    } else {
      stamp(point.x, point.y);
    }
    lastPoint = point;
    draw();
    scheduleRun();
  }

  function onPointerUp() {
    drawing = false;
    lastPoint = null;
  }

  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'crosshair';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  const resizeObserver = createResizeObserver(canvas, draw);

  // 用空画板先跑一次：打开页面即可看到「加载 → 输出」的完整闭环。
  draw();
  void run();

  return {
    update() {
      // 输入来自画板绘制，本实例没有 args；保留空实现以适配共享外壳。
    },
    dispose() {
      window.clearTimeout(debounceId);
      runToken += 1;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      resizeObserver.disconnect();
      // 注意：这里不释放共享会话——页面里另一个内嵌实例可能仍在使用；
      // 会话与张量的释放策略属于「内存管理」课程。
    },
  };
}
