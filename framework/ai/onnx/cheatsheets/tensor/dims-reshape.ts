/**
 * 范例：dims 只是形状标签，data 始终是一维行优先缓冲；reshape 换形状不换数据。
 * 输入：「行数」「列数」控件决定 A 的 dims [rows, cols]，data 取序列 1..rows×cols。
 * 操作：调整行列数，对照左右两个网格与读数。
 * 预期结果：A 与 B（A.reshape([cols, rows])）形状不同、size 相同，且
 * A.data === B.data 成立——reshape 返回的新张量共享同一个 TypedArray；
 * 网格按行优先铺开，单元格里的一维下标连续不断：data[row * cols + col]。
 * 阅读主线：构造 A → reshape 得 B → 画布并排铺开两个网格对照下标。
 */
import { Tensor } from 'onnxruntime-web';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface DimsReshapeSnapshot {
  dimsA: string;
  dimsB: string;
  size: number;
  sameBuffer: string;
  dataPreview: string;
}

export interface DimsReshapeInstance {
  update(options: { rows: number; cols: number }): void;
  dispose(): void;
}

function formatDims(dims: readonly number[]): string {
  return `[${dims.join(', ')}]`;
}

export function createDimsReshape(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DimsReshapeSnapshot) => void,
): DimsReshapeInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let rows = 2;
  let cols = 3;

  function drawGrid(
    originX: number,
    originY: number,
    gridRows: number,
    gridCols: number,
    cell: number,
  ) {
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        const flat = row * gridCols + col;
        const x = originX + col * cell;
        const y = originY + row * cell;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, cell - 3, cell - 3);
        ctx.strokeStyle = '#dbe3f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cell - 3, cell - 3);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(String(flat), x + 5, y + 12);

        ctx.fillStyle = '#172033';
        ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(flat + 1), x + (cell - 3) / 2, y + cell / 2 + 8);
        ctx.textAlign = 'left';
      }
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';

    // 构造与 reshape：B 与 A 的 data 是同一个 TypedArray
    const data = new Float32Array(rows * cols);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = i + 1;
    }
    const a = new Tensor('float32', data, [rows, cols]);
    const b = a.reshape([cols, rows]);
    const sameBuffer = a.data === b.data;

    const cell = Math.min(
      56,
      (width / 2 - 110) / Math.max(cols, rows),
      (height - 190) / Math.max(rows, cols),
    );
    const gridTop = 76;
    const centerA = width / 4;
    const centerB = (width * 3) / 4;

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `A = new Tensor('float32', data, ${formatDims(a.dims)})`,
      centerA,
      gridTop - 14,
    );
    ctx.fillText(`B = A.reshape(${formatDims(b.dims)})`, centerB, gridTop - 14);
    ctx.textAlign = 'left';

    // 左：A 按 [rows, cols] 折叠；右：B 按 [cols, rows] 折叠（CSS 在 50% 处画分隔线）
    drawGrid(centerA - (cols * cell) / 2, gridTop, rows, cols, cell);
    drawGrid(centerB - (rows * cell) / 2, gridTop, cols, rows, cell);

    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `dims ${formatDims(a.dims)}，行优先`,
      centerA,
      gridTop + rows * cell + 22,
    );
    ctx.fillText(
      `dims ${formatDims(b.dims)}，data 不变`,
      centerB,
      gridTop + cols * cell + 22,
    );
    ctx.textAlign = 'left';

    emit({
      dimsA: formatDims(a.dims),
      dimsB: formatDims(b.dims),
      size: a.size,
      sameBuffer: `${sameBuffer}（同一 TypedArray）`,
      dataPreview: Array.from(a.data).join(', '),
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      rows = Math.max(1, Math.round(options.rows));
      cols = Math.max(1, Math.round(options.cols));
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
