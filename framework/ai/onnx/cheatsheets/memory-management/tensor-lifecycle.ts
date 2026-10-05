/**
 * 范例：张量生命周期——location 决定数据在哪，dispose 与 getData(true) 决定怎么释放。
 * 前置状态：纯前端构造，不需要模型与网络。
 * 操作：用 Controls 切换「张量操作」：construct → dispose → getData；点击画布重放。
 * 演示代码不预检张量状态——直接调用 Tensor API，真实行为（包括报错原文）就是证据。
 * 预期结果：
 *  - 构造后 location 'cpu'，.data 可读，外部持有的 TypedArray 与 tensor.data 是同一个数组；
 *  - dispose 后 location 变 'none'（dispose 幂等，重复调用无副作用），再读 .data 抛
 *    'The tensor is disposed.'，但外部引用仍可读——GC 只回收无引用的数据；
 *  - getData(true) 在已释放的张量上同样报错；在 CPU 张量上调用则照常返回数据，
 *    且 releaseData=true 被忽略（该参数只对 GPU 数据生效）。
 * 阅读主线：perform(action)（真实调用 Tensor API → 记录读数与错误原文）；面板属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { Tensor } from 'onnxruntime-web';

export type TensorAction = 'construct' | 'dispose' | 'getData';

export const TENSOR_ACTION_LABELS: Record<TensorAction, string> = {
  construct: '构造 construct',
  dispose: '释放 dispose',
  getData: '读取 getData(true)',
};

/** 每个操作对应的调用形式。 */
export const TENSOR_ACTION_HINTS: Record<TensorAction, string> = {
  construct: "new Tensor('float32', data, [2, 3])",
  dispose: 'tensor.dispose()',
  getData: 'await tensor.getData(true)',
};

const DATA = [1, 2, 3, 4, 5, 6];

export interface TensorLifecycleSnapshot {
  status: 'ready' | 'running';
  message: string;
  location: string;
  dataRead: string;
  externalRef: string;
  getDataResult: string;
}

export interface TensorLifecycleInstance {
  update(options: { action: TensorAction }): void;
  dispose(): void;
}

export function createTensorLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TensorLifecycleSnapshot) => void,
): TensorLifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let tensor: Tensor | null = null;
  // 外部引用：构造前单独持有的 TypedArray。dispose 只断开张量与数据的内部联系，
  // 这个引用仍在——用它证明「dispose 不回收数据本身，回收交给 GC」。
  let external: Float32Array | null = null;
  let action: TensorAction = 'construct';
  let status: TensorLifecycleSnapshot['status'] = 'ready';
  let message = '切换操作或点击画布执行';
  let dataRead = '—';
  let getDataResult = '—';
  let token = 0;
  let layout = { width: 560, height: 320 };

  function emitSnapshot(): void {
    emit({
      status,
      message,
      location: tensor ? tensor.location : '—',
      dataRead,
      externalRef: external
        ? `仍可读 [${Array.from(external).join(',')}]`
        : '—',
      getDataResult,
    });
  }

  /** 真实读取 .data：不预检状态，错误原文就是证据。 */
  function readData(t: Tensor): string {
    try {
      const data = t.data as Float32Array;
      return `Float32Array(${data.length}) [${Array.from(data).join(',')}]`;
    } catch (error) {
      return error instanceof Error ? `Error: ${error.message}` : String(error);
    }
  }

  function draw(): void {
    const { width, height } = layout;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('张量的生命周期：location 决定释放方式', 28, 32);

    // 左侧：张量卡片——三要素 + location 徽标 + 数据格子。
    const cardWidth = Math.max(220, Math.min(260, width * 0.42));
    const disposed = tensor !== null && tensor.location === 'none';
    ctx.beginPath();
    ctx.roundRect(28, 48, cardWidth, 200, 8);
    ctx.fillStyle = '#f4f6fa';
    ctx.fill();

    ctx.fillStyle = '#172033';
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('Tensor', 44, 74);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(tensor ? "type 'float32'" : 'type —', 44, 96);
    ctx.fillText(tensor ? 'dims [2, 3]' : 'dims —', 44, 114);

    // location 徽标：cpu 蓝、none 红。
    const locationText = tensor ? `location '${tensor.location}'` : "location '—'";
    const badgeWidth = ctx.measureText(locationText).width + 20;
    ctx.beginPath();
    ctx.roundRect(44, 124, badgeWidth, 22, 5);
    ctx.fillStyle = tensor === null ? '#e2e8f0' : disposed ? '#fdeaea' : '#eef3ff';
    ctx.fill();
    ctx.fillStyle = tensor === null ? '#64748b' : disposed ? '#dc2626' : '#2563eb';
    ctx.fillText(locationText, 54, 139);

    // 数据格子：dispose 后变灰表示张量侧已不可读。
    const cellSize = 34;
    DATA.forEach((value, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 44 + col * (cellSize + 8);
      const y = 160 + row * (cellSize + 8);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 5);
      ctx.fillStyle = disposed ? '#e2e8f0' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = disposed ? '#cbd5e1' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = disposed ? '#94a3b8' : '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const text = String(value);
      ctx.fillText(text, x + (cellSize - ctx.measureText(text).width) / 2, y + 21);
      if (disposed) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + cellSize - 6, y + cellSize - 6);
        ctx.stroke();
      }
    });

    // 右侧：操作结果面板。
    const panelX = 28 + cardWidth + 24;
    const panelWidth = width - panelX - 28;
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('操作结果', panelX, 64);

    const rows: Array<[string, string, boolean]> = [
      ['.data 读取', dataRead, dataRead.startsWith('Error')],
      ['外部持有的 TypedArray', external ? '仍可读（GC 只回收无引用的数据）' : '—', false],
      ['getData(true)', getDataResult, getDataResult.startsWith('Error')],
    ];
    rows.forEach(([label, value, isError], index) => {
      const y = 90 + index * 46;
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, panelX, y);
      ctx.fillStyle = isError ? '#dc2626' : '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(value, panelWidth - 8).forEach((line, lineIndex) => {
        ctx.fillText(line, panelX, y + 17 + lineIndex * 15);
      });
    });

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('点击画布：重放当前选中的操作', 28, height - 32);
    ctx.fillStyle = status === 'running' ? '#4f7cff' : '#64748b';
    ctx.fillText(message, 28, height - 14);
  }

  function wrapText(text: string, maxWidth: number): string[] {
    if (ctx.measureText(text).width <= maxWidth) {
      return [text];
    }
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      if (ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length >= 2) {
          break;
        }
      } else {
        line += char;
      }
    }
    if (lines.length < 2 && line) {
      lines.push(line);
    }
    return lines.slice(0, 2);
  }

  async function perform(next: TensorAction): Promise<void> {
    action = next;
    const myToken = ++token;
    status = 'running';
    message = '执行中…';
    draw();
    emitSnapshot();

    if (next === 'construct') {
      external = new Float32Array(DATA);
      tensor = new Tensor('float32', external, [2, 3]);
      dataRead = readData(tensor);
      getDataResult = '—';
      message = '构造完成：外部引用与 tensor.data 是同一个数组';
    } else if (next === 'dispose') {
      if (!tensor) {
        message = '先构造张量';
      } else {
        // dispose 是幂等的：内部引用清空、GPU 侧调用底层释放器、location 置 'none'。
        tensor.dispose();
        dataRead = readData(tensor);
        message = 'dispose 完成（幂等，重复调用无副作用）';
      }
    } else if (tensor) {
      try {
        const data = (await tensor.getData(true)) as Float32Array;
        if (myToken === token) {
          getDataResult = `返回 Float32Array(${data.length})——CPU 张量忽略 releaseData`;
          message = '读取成功：releaseData=true 只对 GPU 数据生效';
        }
      } catch (error) {
        if (myToken === token) {
          const text = error instanceof Error ? error.message : String(error);
          getDataResult = `Error: ${text}`;
          message = '已释放的张量不能读取（错误即证据）';
        }
      }
    } else {
      message = '先构造张量';
    }

    if (myToken !== token) {
      return;
    }
    status = 'ready';
    draw();
    emitSnapshot();
    emitSoon();
  }

  function replay(): void {
    void perform(action);
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    layout = {
      width: Math.max(560, size.width),
      height: Math.max(320, size.height),
    };
    draw();
  });
  layout = { width: Math.max(560, readCanvasSize(canvas).width), height: 320 };
  canvas.addEventListener('pointerdown', replay);

  // 共享外壳的读数有 100ms 节流：状态定格后补发一次，确保最终值被绘制。
  let emitTimer = 0;
  function emitSoon(): void {
    window.clearTimeout(emitTimer);
    emitTimer = window.setTimeout(() => {
      draw();
      emitSnapshot();
    }, 130);
  }

  return {
    update(options) {
      void perform(options.action);
    },
    dispose() {
      token += 1;
      window.clearTimeout(emitTimer);
      canvas.removeEventListener('pointerdown', replay);
      resizeObserver.disconnect();
      // 纯 CPU 张量由 GC 兜底：无需（也无法）显式释放 TypedArray。
    },
  };
}
