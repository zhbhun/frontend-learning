/**
 * 范例：float16 在 JavaScript 里没有对应的数组类型，ort 用 Uint16Array 存放
 * IEEE 754 binary16（半精度）的位模式。
 * 输入：「输入值」滑杆提供一个 number（默认 0.1）。
 * 操作：拖动滑杆，对照同一个值在 float32 与 float16 下的存储结果。
 * 预期结果：float32 尾数 23 位、约 7 位十进制有效数字；float16 尾数只有 10 位、
 * 约 3 位，解回值出现可见偏差（0.1 → 0.0999755859375）。位模式整数就是
 * new Tensor('float16', bits, [1]).data 里的元素，读回数值需要再解码一次。
 * 阅读主线：float32ToHalf 编码 → halfToFloat32 解码 → 画布逐行对照两种存储。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

const f32Scratch = new Float32Array(1);
const u32Scratch = new Uint32Array(f32Scratch.buffer);

/**
 * number → IEEE 754 binary16 的 16 位位模式。
 * ort 没有内置该转换：写 float16 张量前需要自备（常规数按最近值舍入，次正规数截断）。
 */
export function float32ToHalf(value: number): number {
  f32Scratch[0] = value;
  const x = u32Scratch[0];

  const sign = (x >>> 16) & 0x8000;
  const exp32 = (x >>> 23) & 0xff;
  const mant32 = x & 0x7fffff;

  // NaN / Infinity：指数全 1，原样搬运
  if (exp32 === 0xff) {
    return sign | 0x7c00 | (mant32 !== 0 ? 0x0200 : 0);
  }

  // 指数重新偏置：float32 偏移 127，float16 偏移 15
  const exp = exp32 - 127 + 15;
  if (exp >= 0x1f) {
    return sign | 0x7c00; // 超出 ±65504：溢出为 Infinity
  }
  if (exp <= 0) {
    if (exp < -10) {
      return sign; // 数值过小：下溢为带符号的 0
    }
    // float16 次正规数：把隐含位并入尾数后整体右移
    const shifted = (mant32 | 0x800000) >>> (1 - exp);
    return sign | (shifted >>> 13);
  }

  // 常规数：截去尾数低 13 位后按最近值舍入；进位自然并入指数位
  let result = (exp << 10) | (mant32 >>> 13);
  const remainder = mant32 & 0x1fff;
  if (remainder > 0x1000 || (remainder === 0x1000 && (result & 1) === 1)) {
    result += 1;
  }
  return sign | result;
}

/** IEEE 754 binary16 的 16 位位模式 → number。读 float16 张量后用它解码。 */
export function halfToFloat32(bits: number): number {
  const sign = (bits & 0x8000) << 16;
  const exp = (bits >>> 10) & 0x1f;
  const mant = bits & 0x3ff;

  let f32Bits: number;
  if (exp === 0) {
    if (mant === 0) {
      f32Bits = sign; // ±0
    } else {
      // 次正规数：左移规格化，找到最高有效位
      let shifted = mant;
      let adjust = -1;
      while ((shifted & 0x400) === 0) {
        shifted <<= 1;
        adjust += 1;
      }
      f32Bits = sign | ((127 - 15 - adjust) << 23) | ((shifted & 0x3ff) << 13);
    }
  } else if (exp === 0x1f) {
    f32Bits = sign | 0x7f800000 | (mant << 13); // Infinity / NaN
  } else {
    f32Bits = sign | ((exp - 15 + 127) << 23) | (mant << 13);
  }

  u32Scratch[0] = f32Bits >>> 0;
  return f32Scratch[0];
}

export interface Float16Snapshot {
  value: string;
  stored32: string;
  bits: string;
  decoded: string;
  delta: string;
}

export interface Float16Instance {
  update(options: { value: number }): void;
  dispose(): void;
}

function toHex(bits: number): string {
  return `0x${bits.toString(16).padStart(4, '0')}`;
}

function formatDelta(delta: number): string {
  if (delta === 0) {
    return '0（两种类型存储一致）';
  }
  return `${delta > 0 ? '+' : ''}${delta.toPrecision(3)}`;
}

export function createFloat16Bits(
  canvas: HTMLCanvasElement,
  emit: (snapshot: Float16Snapshot) => void,
): Float16Instance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current = 0.1;

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

    // 同一个 number 的两种存储：float32 直接存，float16 先编码成位模式再存
    const stored32 = Math.fround(current);
    const bits = float32ToHalf(current);
    const decoded = halfToFloat32(bits);
    const delta = decoded - stored32;

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `float32ToHalf(${String(current)}) → ${toHex(bits)}`,
      28,
      46,
    );

    const rows: Array<[string, string, string]> = [
      ['输入值', String(current), '#172033'],
      ['float32 存储值（Math.fround）', String(stored32), '#172033'],
      ['float16 位模式（Uint16Array 元素）', `${toHex(bits)}（十进制 ${bits}）`, '#4f7cff'],
      ['float16 解回值（halfToFloat32）', String(decoded), '#4f7cff'],
      ['float16 解回值 − float32 存储值', formatDelta(delta), '#b45309'],
    ];
    const rowHeight = 34;
    const top = 92;
    rows.forEach(([label, value, color], index) => {
      const y = top + index * rowHeight;
      ctx.fillStyle = '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, 28, y);
      ctx.fillStyle = color;
      ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, width - 28, y);
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      'float16 范围 ±65504：更大的值溢出为 Infinity，约 6e-8 以下下溢为 0',
      width - 28,
      height - 20,
    );
    ctx.textAlign = 'left';

    emit({
      value: String(current),
      stored32: String(stored32),
      bits: `${toHex(bits)}（十进制 ${bits}）`,
      decoded: String(decoded),
      delta: formatDelta(delta),
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options.value;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
