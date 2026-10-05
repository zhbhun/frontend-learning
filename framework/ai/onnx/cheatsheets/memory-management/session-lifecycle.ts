/**
 * 范例：会话生命周期——create → run → release，以及释放之后再 run 的真实行为。
 * 前置状态：浏览器需能访问模型文件与 ort wasm 的 CDN；MNIST 模型约 26KB，运行时
 * 从 ONNX Model Zoo 的 media 端点拉取；无跨域隔离响应头，wasm 保持单线程。
 * 操作：用 Controls 切换「生命周期操作」，切换即执行；点击画布重放当前选中的操作。
 * 演示代码不预检会话状态——直接调用 ort API，真实行为（包括报错原文）就是证据。
 * 预期结果：
 *  - create / run 成功：读数给出 inputNames 与输出 dims；
 *  - release 成功后：JS 引用还在、inputNames 仍可读，但 run 立即失败，面板显示
 *    ort 抛出的错误原文（cannot run inference. invalid session id: …）；
 *  - 对已释放的会话再次 release 同样报错；重新 create 后恢复正常。
 * 阅读主线：perform(action)（按当前状态真实调用 ort API → 计时并记录结果）；面板与读数属于演示外壳。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

export type LifecycleAction = 'create' | 'run' | 'release';

export const LIFECYCLE_ACTION_LABELS: Record<LifecycleAction, string> = {
  create: '创建 create',
  run: '推理 run',
  release: '释放 release',
};

/** 每个操作对应的调用形式。 */
export const LIFECYCLE_ACTION_HINTS: Record<LifecycleAction, string> = {
  create: 'await InferenceSession.create(MODEL_URL)',
  run: 'await session.run(feeds)',
  release: 'await session.release()',
};

/** 与工作区安装的 onnxruntime-web@1.30.0 配套的 wasm 资源 CDN。 */
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';

/**
 * ONNX Model Zoo 的 MNIST 模型（约 26KB）。
 * 模型文件走 Git LFS：浏览器 fetch 要用 GitHub 的 media 端点（响应带 CORS 头）。
 */
const MODEL_URL =
  'https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mnist/model/mnist-8.onnx';

const GRID = 28;

interface EventChip {
  ok: boolean;
  label: string;
}

export interface SessionLifecycleSnapshot {
  status: 'ready' | 'running';
  message: string;
  refState: string;
  inputNames: string;
  lastAction: string;
  lastError: string;
}

export interface SessionLifecycleInstance {
  update(options: { action: LifecycleAction }): void;
  dispose(): void;
}

export function createSessionLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SessionLifecycleSnapshot) => void,
): SessionLifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let session: InferenceSession | null = null;
  let released = false;
  let action: LifecycleAction = 'run';
  let status: SessionLifecycleSnapshot['status'] = 'ready';
  let message = '切换操作或点击画布执行';
  let lastAction = '—';
  let lastError = '—';
  const events: EventChip[] = [];
  let token = 0;
  let layout = { width: 560, height: 320 };

  function emitSnapshot(): void {
    emit({
      status,
      message,
      // release 之后 JS 包装对象仍持有签名等元数据——inputNames 照常可读，这是证据之一。
      refState: session === null ? '未创建' : released ? '已释放（JS 引用还在）' : '有效',
      inputNames: session ? session.inputNames.join(', ') : '—',
      lastAction,
      lastError,
    });
  }

  function pushEvent(ok: boolean, label: LifecycleAction): void {
    events.push({ ok, label: LIFECYCLE_ACTION_LABELS[label].split(' ')[1] ?? label });
    if (events.length > 6) {
      events.shift();
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
    ctx.fillText('session 的生命周期：create → run → release', 28, 32);

    // 最近事件条：绿 = 成功，红 = 失败（失败即证据）。
    events.forEach((item, index) => {
      const x = 28 + index * 86;
      ctx.beginPath();
      ctx.roundRect(x, 44, 78, 24, 5);
      ctx.fillStyle = item.ok ? '#eef7ef' : '#fdeaea';
      ctx.fill();
      ctx.strokeStyle = item.ok ? '#15803d' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = item.ok ? '#15803d' : '#dc2626';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`${item.ok ? '✓' : '✗'} ${item.label}`, x + 8, 60);
    });

    // 左侧：三个生命周期操作。
    const actions: LifecycleAction[] = ['create', 'run', 'release'];
    const listWidth = Math.max(200, Math.min(240, width * 0.38));
    actions.forEach((item, index) => {
      const y = 88 + index * 54;
      const active = item === action;
      ctx.beginPath();
      ctx.roundRect(28, y, listWidth, 46, 6);
      ctx.fillStyle = active ? '#eef3ff' : '#f4f6fa';
      ctx.fill();
      if (active) {
        ctx.strokeStyle = '#4f7cff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = active ? '#172033' : '#475569';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(LIFECYCLE_ACTION_LABELS[item], 42, y + 19);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(truncate(LIFECYCLE_ACTION_HINTS[item], listWidth - 28), 42, y + 36);
    });

    // 右侧：当前状态与最近一次操作的结果。
    const panelX = 28 + listWidth + 24;
    const panelWidth = width - panelX - 28;
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('当前状态', panelX, 100);

    const rows: Array<[string, string]> = [
      ['当前引用', session === null ? '未创建' : released ? '已释放（JS 引用还在）' : '有效'],
      ['inputNames', session ? session.inputNames.join(', ') : '—'],
      ['最近操作', lastAction],
    ];
    rows.forEach(([label, value], index) => {
      const y = 126 + index * 32;
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, panelX, y);
      ctx.fillStyle = '#172033';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(truncate(value, panelWidth - 8), panelX + 78, y);
    });

    const errorY = 126 + rows.length * 32;
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('上次错误', panelX, errorY);
    if (lastError === '—') {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('—', panelX + 78, errorY);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(lastError, panelWidth - 16).forEach((line, index) => {
        ctx.fillText(line, panelX + 78, errorY + index * 17);
      });
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('点击画布：重放当前选中的操作（如连续两次 release）', 28, height - 32);
    ctx.fillStyle = status === 'running' ? '#4f7cff' : '#64748b';
    ctx.fillText(message, 28, height - 14);
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

  /** 创建新会话并替换当前引用（无论旧会话是否已释放）。 */
  async function doCreate(myToken: number): Promise<void> {
    // env 是页面级全局单例：wasm 标志只在第一次 create 时读取；重复设置幂等。
    env.wasm.wasmPaths = WASM_CDN;
    env.wasm.numThreads = 1; // 工作区无 COOP/COEP 响应头（跨域隔离），保持单线程基线。
    const replacedAlive = session !== null && !released;
    const start = performance.now();
    const created = await InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    if (myToken !== token) {
      return;
    }
    session = created;
    released = false;
    const ms = (performance.now() - start).toFixed(1);
    lastAction = `create 成功 · ${ms}ms`;
    lastError = '—';
    pushEvent(true, 'create');
    if (replacedAlive) {
      // 直接替换引用就是「丢弃而不释放」：wasm 侧资源不会自动回收。
      message = '注意：旧会话未 release 就被替换，wasm 侧资源不会自动释放';
    }
  }

  async function doRun(myToken: number): Promise<void> {
    if (!session) {
      // 演示从 run 开始时先自动建一次会话，让首个读数落在成功路径上。
      message = 'session 为空，自动 create…';
      draw();
      emitSnapshot();
      await doCreate(myToken);
      if (myToken !== token) {
        return;
      }
    }
    const target = session as InferenceSession;
    const feeds: InferenceSession.FeedsType = {
      [target.inputNames[0]]: new Tensor('float32', new Float32Array(GRID * GRID), [1, 1, GRID, GRID]),
    };
    const start = performance.now();
    // 不预检 released：对已释放的会话调用，让 ort 抛出真实错误。
    const outputs = await target.run(feeds);
    if (myToken !== token) {
      return;
    }
    const ms = (performance.now() - start).toFixed(1);
    const dims = (outputs[target.outputNames[0]] as Tensor).dims.join(',');
    lastAction = `run 成功 · ${ms}ms · 输出 [${dims}]`;
    lastError = '—';
    pushEvent(true, 'run');
  }

  async function doRelease(myToken: number): Promise<void> {
    if (!session) {
      lastAction = 'release 跳过（没有会话）';
      lastError = '—';
      return;
    }
    const start = performance.now();
    // release(): Promise<void>——等待释放完成再继续；二次释放的错误由上层捕获展示。
    await session.release();
    if (myToken !== token) {
      return;
    }
    const ms = (performance.now() - start).toFixed(1);
    released = true;
    lastAction = `release 成功 · ${ms}ms`;
    lastError = '—';
    pushEvent(true, 'release');
  }

  async function perform(next: LifecycleAction): Promise<void> {
    action = next;
    const myToken = ++token;
    status = 'running';
    message = '执行中…';
    draw();
    emitSnapshot();
    try {
      if (next === 'create') {
        await doCreate(myToken);
      } else if (next === 'run') {
        await doRun(myToken);
      } else {
        await doRelease(myToken);
      }
      if (myToken !== token) {
        return;
      }
      status = 'ready';
      if (message.startsWith('执行中')) {
        message = '就绪';
      }
    } catch (error) {
      if (myToken !== token) {
        return;
      }
      const text = error instanceof Error ? error.message : String(error);
      lastAction = `${LIFECYCLE_ACTION_LABELS[next]} 失败`;
      lastError = text;
      pushEvent(false, next);
      status = 'ready';
      message = '就绪（红字错误即证据，见「上次错误」）';
    }
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
      // 离开页面时释放本实例创建的会话；会话本身不随实例销毁自动释放。
      if (session !== null && !released) {
        released = true;
        void session.release().catch(() => undefined);
      }
    },
  };
}
