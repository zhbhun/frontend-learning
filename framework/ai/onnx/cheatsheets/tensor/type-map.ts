/**
 * 范例：type 决定 data 用哪种 TypedArray 承载——六种代表类型逐一真实构造并读回验证。
 * 输入：「数据类型」控件在 float32 / int32 / int64 / float16 / bool / string 之间切换，
 * 每种类型用一组固定的逻辑值执行 new Tensor(type, data, dims)。
 * 操作：切换控件，对照构造表达式、data 的实际载体与内容。
 * 预期结果：载体随 type 变化——float16 是 16 位位模式（无原生 Float16Array 的环境显示
 * Uint16Array），int64 的元素是 bigint 且 Number() 读回 9007199254740993n 已失真，
 * bool 是 0/1 的 Uint8Array，string 是 string[]。
 * 阅读主线：buildSample 构造张量 → 读回 dims/size/carrier/内容 → 画布左右分栏呈现。
 */
import { Tensor } from 'onnxruntime-web';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { float32ToHalf, halfToFloat32 } from './float16-bits';

export type DtypeId =
  | 'float32'
  | 'int32'
  | 'int64'
  | 'float16'
  | 'bool'
  | 'string';

export const DTYPE_IDS: readonly DtypeId[] = [
  'float32',
  'int32',
  'int64',
  'float16',
  'bool',
  'string',
];

export interface TypeMapSnapshot {
  dtype: DtypeId;
  expression: string;
  dims: string;
  size: number;
  carrier: string;
  rows: Array<[string, string]>;
  preview: string[];
  previewCols: number;
}

export interface TypeMapInstance {
  update(options: { dtype: DtypeId }): void;
  dispose(): void;
}

const EXPRESSIONS: Record<DtypeId, string> = {
  float32: `new Tensor('float32', [0.1, 1.5, -2.25, 3.14], [2, 2])`,
  int32: `new Tensor('int32', [-1, 0, 2147483647, 7], [2, 2])`,
  int64: `new Tensor('int64', [9007199254740993n, 42n], [2])`,
  float16: `new Tensor('float16', bits, [2, 2])`,
  bool: `new Tensor('bool', [true, false, true], [3])`,
  string: `new Tensor('string', ['cat', 'dog'], [2])`,
};

function formatDims(dims: readonly number[]): string {
  return `[${dims.join(', ')}]`;
}

/** 按类型真实构造一个 Tensor，并把要展示的读数整理成快照。 */
function buildSample(dtype: DtypeId): TypeMapSnapshot {
  switch (dtype) {
    case 'float32': {
      const tensor = new Tensor('float32', [0.1, 1.5, -2.25, 3.14], [2, 2]);
      return {
        dtype,
        expression: EXPRESSIONS.float32,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          ['data 内容', Array.from(tensor.data).join(', ')],
          ['元素 typeof', 'number'],
        ],
        preview: ['0.1', '1.5', '-2.25', '3.14'],
        previewCols: 2,
      };
    }
    case 'int32': {
      const tensor = new Tensor('int32', [-1, 0, 2147483647, 7], [2, 2]);
      return {
        dtype,
        expression: EXPRESSIONS.int32,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          ['data 内容', Array.from(tensor.data).join(', ')],
          ['元素 typeof', 'number'],
        ],
        preview: ['-1', '0', '2147483647', '7'],
        previewCols: 2,
      };
    }
    case 'int64': {
      // 首元素超过 Number.MAX_SAFE_INTEGER：bigint 原样保留，Number() 读回即失真
      const tensor = new Tensor('int64', [9007199254740993n, 42n], [2]);
      return {
        dtype,
        expression: EXPRESSIONS.int64,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          ['data 内容', Array.from(tensor.data).map((v) => `${v}n`).join(', ')],
          ['元素 typeof', 'bigint'],
          ['Number(data[0])', `${Number(tensor.data[0])}（已失真）`],
        ],
        preview: ['9007199254740993n', '42n'],
        previewCols: 1,
      };
    }
    case 'float16': {
      // float16 不能从普通 number[] 构造：先把数值编码成 16 位位模式
      const values = [1, 0.5, 0.1, 65504];
      const bits = Uint16Array.from(values.map(float32ToHalf));
      const tensor = new Tensor('float16', bits, [2, 2]);
      return {
        dtype,
        expression: EXPRESSIONS.float16,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          [
            'data 内容（位模式）',
            Array.from(tensor.data)
              .map((item) => `0x${item.toString(16).padStart(4, '0')}`)
              .join(', '),
          ],
          [
            '解码回数值',
            values.map((v) => String(halfToFloat32(float32ToHalf(v)))).join(', '),
          ],
          ['载体说明', '无原生 Float16Array 的环境为 Uint16Array'],
        ],
        preview: ['0x3c00', '0x3800', '0x2e66', '0x7bff'],
        previewCols: 2,
      };
    }
    case 'bool': {
      const tensor = new Tensor('bool', [true, false, true], [3]);
      return {
        dtype,
        expression: EXPRESSIONS.bool,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          ['data 内容', Array.from(tensor.data).join(', ')],
          ['元素 typeof', 'number（0 / 1）'],
        ],
        preview: ['true', 'false', 'true'],
        previewCols: 3,
      };
    }
    case 'string': {
      const tensor = new Tensor('string', ['cat', 'dog'], [2]);
      return {
        dtype,
        expression: EXPRESSIONS.string,
        dims: formatDims(tensor.dims),
        size: tensor.size,
        carrier: tensor.data.constructor.name,
        rows: [
          ['data 内容', tensor.data.join(', ')],
          ['元素 typeof', 'string'],
        ],
        preview: ['cat', 'dog'],
        previewCols: 2,
      };
    }
  }
}

export function createTypeMap(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TypeMapSnapshot) => void,
): TypeMapInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let snapshot = buildSample('float32');

  function drawPreview(x: number, y: number, maxW: number, maxH: number) {
    const rowCount = Math.ceil(snapshot.preview.length / snapshot.previewCols);
    const cellW = Math.min(136, maxW / snapshot.previewCols);
    const cellH = Math.min(44, maxH / rowCount);
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    snapshot.preview.forEach((text, index) => {
      const cx = x + (index % snapshot.previewCols) * cellW;
      const cy = y + Math.floor(index / snapshot.previewCols) * cellH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy, cellW - 4, cellH - 4);
      ctx.strokeStyle = '#dbe3f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cellW - 4, cellH - 4);
      ctx.fillStyle = '#172033';
      ctx.textAlign = 'center';
      ctx.fillText(text, cx + (cellW - 4) / 2, cy + cellH / 2 + 4);
      ctx.textAlign = 'left';
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'left';

    // 左半：构造表达式 + 张量单元示意
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(snapshot.expression, 28, 48);
    drawPreview(28, 72, width / 2 - 56, height - 110);

    // 右半：从实例读回的要素与内容
    const entries: Array<[string, string]> = [
      ['dims', snapshot.dims],
      ['size', String(snapshot.size)],
      ['data 载体', snapshot.carrier],
      ...snapshot.rows,
    ];
    const top = 64;
    const rowHeight = Math.min(34, (height - 90) / entries.length);
    entries.forEach(([label, value], index) => {
      const y = top + index * rowHeight;
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, width / 2 + 8, y);
      ctx.fillStyle = '#172033';
      ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, width - 28, y);
      ctx.textAlign = 'left';
    });

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      snapshot = buildSample(options.dtype);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
