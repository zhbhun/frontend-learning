/**
 * 范例：run 的 fetches 形态对照——省略、名字数组、预分配对象，外加一个非法名字。
 * 前置状态：浏览器需能访问模型文件与 ort wasm 的 CDN；MNIST 模型约 26KB，运行时
 * 从 ONNX Model Zoo 的 media 端点拉取；会话由 session-runner.ts 创建并全课共享。
 * 操作：用 Controls 切换「fetches 形态」，每次切换对同一份全零输入执行一次 run。
 * 预期结果：读数显示返回 map 的键与输出 dims；切到「预分配对象」可见返回的张量
 * 就是传入的那个（同一引用）；切到「非法名字数组」时捕获 RangeError 并显示原文。
 * 阅读主线：runMode（组 feeds → 按形态调 run → 记录结果）；面板与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { InferenceSession, Tensor } from 'onnxruntime-web';
import { loadSession, runQueued } from './session-runner';

export type FetchesMode = 'omit' | 'array' | 'prealloc' | 'invalid';

export const FETCHES_MODE_LABELS: Record<FetchesMode, string> = {
  omit: '省略 fetches',
  array: '名字数组',
  prealloc: '预分配对象',
  invalid: '非法名字数组',
};

/** 每种形态对应的调用形式。 */
export const FETCHES_MODE_HINTS: Record<FetchesMode, string> = {
  omit: 'run(feeds)',
  array: 'run(feeds, [输出名])',
  prealloc: 'run(feeds, { 输出名: tensor })',
  invalid: "run(feeds, ['not_an_output'])",
};

const GRID = 28;

interface ModeRecord {
  ok: boolean;
  detail: string;
  keys: string;
  dims: string;
  reused: string;
}

export interface RunFetchesSnapshot {
  status: 'loading' | 'running' | 'ready' | 'error';
  message: string;
  mode: FetchesMode;
  feedKey: string;
  keys: string;
  dims: string;
  reused: string;
}

export interface RunFetchesInstance {
  update(options: { mode: FetchesMode }): void;
  dispose(): void;
}

export function createRunFetches(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RunFetchesSnapshot) => void,
): RunFetchesInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let session: InferenceSession | null = null;
  let status: RunFetchesSnapshot['status'] = 'loading';
  let message = '加载模型…';
  let mode: FetchesMode = 'omit';
  let feedKey = '—';
  const records = new Map<FetchesMode, ModeRecord>();
  let token = 0;
  let layout = { width: 560, height: 300 };

  function emitSnapshot() {
    const record = records.get(mode);
    emit({
      status,
      message,
      mode,
      feedKey,
      keys: record ? record.keys : '—',
      dims: record ? record.dims : '—',
      reused: record ? record.reused : '—',
    });
  }

  function draw() {
    const { width, height } = layout;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('session.run(feeds, fetches) 的形态对照', 28, 36);

    const modes: FetchesMode[] = ['omit', 'array', 'prealloc', 'invalid'];
    const rowHeight = 52;
    const listWidth = Math.max(240, width / 2 - 40);
    modes.forEach((item, index) => {
      const y = 60 + index * rowHeight;
      const active = item === mode;
      ctx.beginPath();
      ctx.roundRect(28, y, listWidth, rowHeight - 10, 6);
      ctx.fillStyle = active ? '#eef3ff' : '#f4f6fa';
      ctx.fill();
      if (active) {
        ctx.strokeStyle = '#4f7cff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = active ? '#172033' : '#475569';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(FETCHES_MODE_LABELS[item], 42, y + 20);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(FETCHES_MODE_HINTS[item], 42, y + 37);

      const record = records.get(item);
      if (record) {
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        if (record.ok) {
          ctx.fillStyle = '#15803d';
          ctx.fillText('✓', 28 + listWidth - 20, y + 20);
        } else {
          ctx.fillStyle = '#dc2626';
          ctx.fillText('✗', 28 + listWidth - 20, y + 20);
        }
      }
    });

    // 右侧结果面板：当前形态最近一次 run 的返回。
    const panelX = 28 + listWidth + 24;
    const panelWidth = width - panelX - 28;
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('当前形态的 run 结果', panelX, 76);

    const record = records.get(mode);
    const rows: Array<[string, string]> = [
      ['feeds 键', feedKey],
      ['返回的键', record ? record.keys : '—'],
      ['输出 dims', record ? record.dims : '—'],
      ['预分配缓冲被复用', record ? record.reused : '—'],
    ];
    rows.forEach(([label, value], index) => {
      const y = 106 + index * 34;
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, panelX, y);
      ctx.fillStyle = '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(truncate(value, panelWidth - 8), panelX, y + 16);
    });

    if (record && !record.ok) {
      ctx.fillStyle = '#dc2626';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(record.detail, panelWidth - 16).forEach((line, index) => {
        ctx.fillText(line, panelX, 250 + index * 17);
      });
    }

    ctx.fillStyle = status === 'error' ? '#991b1b' : '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(message, 28, height - 16);
  }

  function truncate(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let result = text;
    while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
      result = result.slice(0, -1);
    }
    return `${result}…`;
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

  function makeFeeds(s: InferenceSession): InferenceSession.FeedsType {
    // feeds 的键必须逐字等于模型输入名；这里统一用全零输入，形态对照只看返回结构。
    return {
      [s.inputNames[0]]: new Tensor('float32', new Float32Array(GRID * GRID), [1, 1, GRID, GRID]),
    };
  }

  async function runMode(next: FetchesMode): Promise<void> {
    mode = next;
    const myToken = ++token;
    const hadSession = session !== null;
    status = 'running';
    message = hadSession ? '推理中…' : '加载模型…';
    draw();
    emitSnapshot();

    try {
      const target = session ?? (await loadSession());
      if (myToken !== token) {
        return;
      }
      session = target;
      feedKey = target.inputNames[0];

      const feeds = makeFeeds(target);
      const record: ModeRecord = { ok: true, detail: '', keys: '—', dims: '—', reused: '—' };

      if (mode === 'omit') {
        // 省略 fetches：返回模型定义的全部输出。
        const outputs = await runQueued(() => target.run(feeds));
        record.keys = Object.keys(outputs).join(', ');
        record.dims = `[${(outputs[target.outputNames[0]] as Tensor).dims.join(',')}]`;
        record.detail = '返回模型定义的全部输出';
        record.reused = '—（由运行时分配）';
      } else if (mode === 'array') {
        // 名字数组：只返回列出的输出；数组不能为空，名字必须合法。
        const outputs = await runQueued(() => target.run(feeds, [target.outputNames[0]]));
        record.keys = Object.keys(outputs).join(', ');
        record.dims = `[${(outputs[target.outputNames[0]] as Tensor).dims.join(',')}]`;
        record.detail = '只返回请求的输出（本模型只有一个，结果与省略相同）';
        record.reused = '—（由运行时分配）';
      } else if (mode === 'prealloc') {
        // 预分配对象：值为输出名到 Tensor（或 null）的映射，ort 直接写入这块缓冲。
        const preallocated = new Tensor('float32', new Float32Array(10), [1, 10]);
        const outputs = await runQueued(() =>
          target.run(feeds, { [target.outputNames[0]]: preallocated }),
        );
        record.keys = Object.keys(outputs).join(', ');
        record.dims = `[${(outputs[target.outputNames[0]] as Tensor).dims.join(',')}]`;
        // 复用的直接证据：返回 map 里的张量就是传入的那个引用。
        record.reused =
          outputs[target.outputNames[0]] === preallocated ? '是（=== 同一引用）' : '否';
        record.detail = '输出写入预分配缓冲';
      } else {
        // 非法名字：进入 fetches 判定后立即被拒绝，run 不会执行。
        await runQueued(() => target.run(feeds, ['not_an_output']));
        record.detail = '不应到达这里';
      }

      if (myToken !== token) {
        return;
      }
      records.set(mode, record);
      status = 'ready';
      message = '就绪';
    } catch (error) {
      if (myToken !== token) {
        return;
      }
      const text = error instanceof Error ? error.message : String(error);
      const name = error instanceof Error ? error.constructor.name : 'Error';
      if (!hadSession) {
        // 会话本身没建起来：这是实例故障，不是形态对照的证据。
        status = 'error';
        message = `加载失败：${text}（点击画布重试）`;
        canvas.addEventListener('pointerdown', retryOnce);
        draw();
        emitSnapshot();
        return;
      }
      // 非法名字是预期证据，作为该形态的结果展示，不算实例故障。
      records.set(mode, { ok: false, detail: `${name}: ${text}`, keys: '（没有返回）', dims: '—', reused: '—' });
      status = 'ready';
      message = '就绪';
    }
    draw();
    emitSnapshot();
    emitSoon();
  }

  function retryOnce(): void {
    canvas.removeEventListener('pointerdown', retryOnce);
    session = null;
    records.clear();
    void runMode(mode);
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    layout = {
      width: Math.max(560, size.width),
      height: Math.max(300, size.height),
    };
    draw();
  });
  layout = { width: Math.max(560, readCanvasSize(canvas).width), height: 300 };

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
      if (options.mode !== mode || !records.has(options.mode)) {
        void runMode(options.mode);
      } else {
        mode = options.mode;
        draw();
        emitSnapshot();
        emitSoon();
      }
    },
    dispose() {
      token += 1;
      window.clearTimeout(emitTimer);
      canvas.removeEventListener('pointerdown', retryOnce);
      resizeObserver.disconnect();
      // 不释放共享会话：同页另一个实例仍在使用；释放策略见内存管理课程。
    },
  };
}
