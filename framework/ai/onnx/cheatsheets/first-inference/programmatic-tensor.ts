/**
 * 范例：没有现成图片时，用代码直接构造输入张量，并复用同一套推理闭环。
 * 输入：三段循环写出的 28×28 Float32Array（竖线/圆环/横线），黑底为 0、笔画为 1，
 * 取值范围 [0,1]，行优先展开，正好对应模型 [1,1,28,28] 的输入布局。
 * 操作：用「输入图案」控件切换图案，观察右侧输出分布的变化。
 * 预期结果：数字形图案的分数集中在某个类别上；横线这类非数字输入的分布明显更平，
 * 预测与置信度以画布读数为准。
 * 阅读主线：PATTERN_BUILDERS 构造张量数据 → runDigit 复用推理 → 左侧渲染张量内容。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { runDigit, type RunResult } from './first-inference';

export type PatternId = 'stroke' | 'ring' | 'horizontal';

export const PATTERN_LABELS: Record<PatternId, string> = {
  stroke: '竖线（形如 1）',
  ring: '圆环（形如 0）',
  horizontal: '横线（非数字）',
};

const GRID = 28;
const CLASS_COUNT = 10;

// 每个图案都是纯代码写出的 784 个 float32 值：黑底为 0、笔画为 1。
// 传入 runDigit 后被组装成 new Tensor('float32', data, [1,1,28,28])。
const PATTERN_BUILDERS: Record<PatternId, () => Float32Array> = {
  stroke: buildVerticalStroke,
  ring: buildRing,
  horizontal: buildHorizontalStroke,
};

function buildVerticalStroke(): Float32Array {
  const data = new Float32Array(GRID * GRID);
  // 居中 4px 宽的竖笔画，形如数字 1。
  for (let y = 4; y <= 23; y += 1) {
    for (let x = 12; x <= 15; x += 1) {
      data[y * GRID + x] = 1;
    }
  }
  return data;
}

function buildRing(): Float32Array {
  const data = new Float32Array(GRID * GRID);
  // 按像素中心到椭圆的归一化距离画出轮廓，形如数字 0。
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const dx = (x + 0.5 - 14) / 6.5;
      const dy = (y + 0.5 - 14) / 8.5;
      const distance = Math.hypot(dx, dy);
      data[y * GRID + x] = Math.max(0, 1 - Math.abs(distance - 1) * 2.2);
    }
  }
  return data;
}

function buildHorizontalStroke(): Float32Array {
  const data = new Float32Array(GRID * GRID);
  // 贯穿中部的横笔画：不是任何数字，用来观察分布发散时的输出。
  for (let x = 3; x <= 24; x += 1) {
    data[13 * GRID + x] = 1;
    data[14 * GRID + x] = 1;
    data[15 * GRID + x] = 1;
    data[12 * GRID + x] = 0.5;
    data[16 * GRID + x] = 0.5;
  }
  return data;
}

export interface ProgrammaticSnapshot {
  status: 'running' | 'ready' | 'error';
  message: string;
  tensorDesc: string;
  prediction: string;
  scores: number[];
}

export interface ProgrammaticTensorInstance {
  update(options: { pattern: PatternId }): void;
  dispose(): void;
}

const TENSOR_DESC = `float32 [1,1,${GRID},${GRID}]`;

export function createProgrammaticTensor(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProgrammaticSnapshot) => void,
): ProgrammaticTensorInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let grid = PATTERN_BUILDERS.stroke();
  let result: RunResult | null = null;
  let status: ProgrammaticSnapshot['status'] = 'running';
  let message = '推理中…';
  let debounceId = 0;
  let runToken = 0;

  function emitSnapshot() {
    emit({
      status,
      message,
      tensorDesc: TENSOR_DESC,
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

    const previewSize = Math.min(height - 88, width / 2 - 72);
    const previewX = 28;
    const previewY = Math.max(44, (height - previewSize) / 2);

    drawTensor(previewX, previewY, previewSize);
    drawBars(width / 2 + 32, 52, width / 2 - 56, height - 84);

    if (status === 'error') {
      drawError(width, height);
    }
    emitSnapshot();
  }

  function drawTensor(x: number, y: number, size: number) {
    const cell = size / GRID;
    ctx.fillStyle = '#101820';
    ctx.fillRect(x, y, size, size);
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const value = grid[row * GRID + col];
        if (value > 0) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, value).toFixed(3)})`;
          ctx.fillRect(x + col * cell, y + row * cell, cell + 0.5, cell + 0.5);
        }
      }
    }
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`new Tensor('float32', data, [1,1,${GRID},${GRID}])`, x, y + size + 18);
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
    ctx.fillText(status === 'error' ? '加载失败，切换图案可重试' : message, x + 4, y + height / 2);
  }

  function drawError(width: number, height: number) {
    const boxX = width / 2 + 32;
    const boxY = height / 2 - 4;
    const boxWidth = width / 2 - 64;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, 64, 6);
    ctx.fillStyle = '#fff5f5';
    ctx.fill();
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#991b1b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`加载失败：${message.slice(0, 64)}`, boxX + 14, boxY + 24);
    ctx.fillStyle = '#b45309';
    ctx.fillText('切换图案可重试；请检查网络与 wasmPaths 版本（onnxruntime-web@1.30.0）', boxX + 14, boxY + 46);
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

  const resizeObserver = createResizeObserver(canvas, draw);

  // 用默认图案先跑一次：打开页面即可看到「构造张量 → 输出」的完整闭环。
  draw();
  void run();

  return {
    update(options) {
      grid = PATTERN_BUILDERS[options.pattern]();
      result = null;
      draw();
      window.clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        void run();
      }, 120);
    },
    dispose() {
      window.clearTimeout(debounceId);
      runToken += 1;
      resizeObserver.disconnect();
      // 共享会话由 first-inference.ts 缓存，这里不释放。
    },
  };
}
