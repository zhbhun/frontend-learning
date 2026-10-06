/**
 * 范例：模拟组件「挂载 → 加载 → 卸载 → 再挂载」的生命周期，
 * 对照 pipeline 的两种持有方式——模块级单例 vs 每次挂载重建。
 *
 * - 前置状态：首次运行需从 Hub 下载 q8 模型（约 68 MB）并写入浏览器 Cache；
 *   在本浏览器打开过兄弟课时直接命中缓存。文件缓存由所有挂载共享：
 *   无论哪种持有方式，第二次挂载都不会重新下载——差异在会话初始化与内存。
 * - 输入：Controls 的「持有方式」（模块级单例 / 每次挂载重建）与
 *   「模拟卸载并重新挂载」开关（任意切换一次 = 执行一次 卸载 → 重新挂载）。
 * - 操作：等首次挂载就绪后切换「模拟卸载并重新挂载」，对照两次挂载用时；
 *   再切换「持有方式」重复一次，观察实例计数与来源标签的差异。
 * - 预期结果：单例模式第二次挂载约 0 秒（复用已就绪实例，跳过会话初始化，
 *   实例数保持 1）；重建模式命中缓存但仍需重新初始化会话（数百毫秒到数秒），
 *   实例数累加。
 * - 阅读主线：getPipeline 两条加载路径（持有方式的分叉点）→ mount / unmount
 *   （手写的组件生命周期模拟，不引入 JSX）→ draw（挂载记录表与读数输出）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// Storybook 工作区未安装 npm 包，这里按官方 README 的 CDN 用法加载浏览器构建；
// npm 项目请改用：import { pipeline } from '@huggingface/transformers'
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';

// 本课示例模型与兄弟课一致：DistilBERT 情感分类（q8 约 67.6 MB），缓存互相命中
const MODEL_ID = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

/** pipeline 推理函数的最小形态：本课只关心加载成本，不关心输出结构 */
type SentimentPipe = (text: string) => Promise<unknown>;

export type HoldMode = 'singleton' | 'rebuild';
export type LabStatus = 'loading' | 'ready' | 'error';

/** 一次挂载的记录：加载用时与 pipeline 的来源 */
export interface MountRecord {
  index: number;
  seconds: number;
  source: '新建实例' | '复用单例';
}

export interface LabOptions {
  mode: HoldMode;
  remount: boolean;
}

export interface LabSnapshot {
  status: LabStatus;
  mode: HoldMode;
  progress: number;
  message: string;
  mountCount: number;
  instanceCount: number;
  last: MountRecord | null;
  history: MountRecord[];
}

export interface LabInstance {
  update(options: LabOptions): void;
  dispose(): void;
}

export function createSingletonLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LabSnapshot) => void,
): LabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let mode: HoldMode = 'singleton';
  let remount = false;
  let status: LabStatus = 'loading';
  let progress = 0;
  let message = '挂载 #1：正在准备 pipeline…';
  let mountCount = 0;
  let instanceCount = 0;
  let history: MountRecord[] = [];
  let last: MountRecord | null = null;
  let busy = false;
  let started = false;
  let disposed = false;
  // 换持有方式 = 换一个应用实现：epoch 递增，让在途加载的回调不再写状态
  let epoch = 0;

  // ── 模拟的「模块级作用域」：单例的 Promise 存放在这里，与组件的挂载/卸载
  //    无关——这正是模块级单例的定义。切换持有方式时整体重置。
  let moduleInstancePromise: Promise<SentimentPipe> | null = null;
  // 组件自持的引用：重建模式下随组件卸载丢弃（模拟组件状态的生命周期）
  let componentInstance: SentimentPipe | null = null;

  function snapshot(): LabSnapshot {
    return {
      status,
      mode,
      progress,
      message,
      mountCount,
      instanceCount,
      last,
      history,
    };
  }

  // canvas 只画图形状态；readout 表依赖 emit 送出的快照，必须与重绘同步派发
  function draw() {
    render();
    emit(snapshot());
  }

  // 库的动态加载 + pipeline 创建：两种持有方式共用同一条真实加载路径
  async function loadPipeline(
    onProgress: (percent: number) => void,
  ): Promise<SentimentPipe> {
    // @vite-ignore 让 Vite 跳过对这条 URL 的构建期分析，交给浏览器在运行时加载
    const mod = await import(/* @vite-ignore */ TRANSFORMERS_CDN);
    return mod.pipeline('sentiment-analysis', MODEL_ID, {
      progress_callback: (info: { status: string; progress?: number }) => {
        // v4 的 progress_total 聚合事件：所有文件折成一个 0~100 的进度
        // （完整事件流见 1.2 第一个 pipeline 课）
        if (info.status === 'progress_total') {
          onProgress(Math.round(info.progress ?? 0));
        }
      },
    }) as Promise<SentimentPipe>;
  }

  // ── 挂载：框架把组件挂上页面时执行的那个动作 ──
  async function mount() {
    if (busy || disposed) {
      return;
    }
    busy = true;
    const currentEpoch = epoch;
    const mountMode = mode;
    const index = mountCount + 1;
    status = 'loading';
    progress = 0;
    message =
      mountMode === 'singleton'
        ? `挂载 #${index}：向模块级单例请求实例…`
        : `挂载 #${index}：组件自持，重新执行 from_pretrained…`;
    draw();
    const startedAt = performance.now();
    try {
      let pipe: SentimentPipe;
      let created: boolean;
      if (mountMode === 'singleton') {
        // ── 分叉点：单例只在第一次真正加载，之后所有挂载复用同一个 Promise。
        //    缓存的是 Promise 而不是实例——并发请求共用同一次加载。
        const isNew = moduleInstancePromise === null;
        moduleInstancePromise ??= loadPipeline(setPercent(currentEpoch, index));
        pipe = await moduleInstancePromise;
        created = isNew;
      } else {
        // ── 重建模式：每次挂载都完整执行一次 pipeline()，卸载即丢弃 ──
        pipe = await loadPipeline(setPercent(currentEpoch, index));
        componentInstance = pipe; // 组件持有：卸载时随组件释放
        created = true;
      }
      if (disposed || currentEpoch !== epoch) {
        return;
      }
      const seconds = (performance.now() - startedAt) / 1000;
      const source: MountRecord['source'] =
        mountMode === 'singleton' && !created ? '复用单例' : '新建实例';
      if (created) {
        instanceCount += 1; // 只有真正执行过 pipeline() 的挂载才新建实例
      }
      mountCount = index;
      const record: MountRecord = { index, seconds, source };
      last = record;
      history = [...history, record];
      status = 'ready';
      message =
        source === '复用单例'
          ? `挂载 #${index} 就绪：复用已就绪实例（${seconds.toFixed(1)} 秒）——跳过会话初始化，不占新内存`
          : index === 1
            ? `挂载 #${index} 就绪，用时 ${seconds.toFixed(1)} 秒；切换「模拟卸载并重新挂载」看第二次挂载的差异`
            : `挂载 #${index} 就绪，用时 ${seconds.toFixed(1)} 秒——文件命中浏览器缓存，但会话初始化与内存重新付出`;
      draw();
    } catch (error) {
      if (disposed || currentEpoch !== epoch) {
        return;
      }
      status = 'error';
      const detail = error instanceof Error ? error.message : String(error);
      // 失败的 Promise 不留在单例缓存里：否则错误也会被"单例"住，重试永远失败
      moduleInstancePromise = null;
      message = `挂载 #${index} 失败：${detail}。常见原因：网络受限或无法访问 huggingface.co / cdn.jsdelivr.net；切换「模拟卸载并重新挂载」即可重试。`;
      draw();
    } finally {
      if (currentEpoch === epoch) {
        busy = false;
      }
    }
  }

  /** 进度回调工厂：写入当前挂载的进度条，旧 epoch 的回调直接丢弃 */
  function setPercent(
    currentEpoch: number,
    index: number,
  ): (percent: number) => void {
    return (percent) => {
      if (disposed || currentEpoch !== epoch || percent === progress) {
        return;
      }
      progress = percent;
      message = `挂载 #${index}：正在加载模型（q8 约 68 MB，命中缓存则跳过下载）：${percent}%`;
      draw();
    };
  }

  // ── 卸载：组件卸载时框架执行的动作 ──
  function unmount() {
    if (mode === 'rebuild') {
      componentInstance = null; // 组件自持的实例随组件一起释放
    }
    // 单例模式：模块级缓存原样保留，等待下一次挂载复用——这正是单例的意义
  }

  /** 换持有方式 = 换一个应用实现：模拟的模块作用域与挂载记录全部重来 */
  function reset() {
    epoch += 1;
    moduleInstancePromise = null;
    componentInstance = null;
    mountCount = 0;
    instanceCount = 0;
    history = [];
    last = null;
    busy = false;
    status = 'loading';
    progress = 0;
  }

  function remountCycle() {
    if (busy) {
      return; // 加载进行中：等就绪后再切
    }
    unmount();
    void mount();
  }

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text;
    while (cut.length > 0 && drawingContext.measureText(`${cut}…`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}…`;
  }

  function wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const char of text) {
      const candidate = line + char;
      if (line && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function render() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const contentWidth = width - 96;
    const mono13 = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    const mono14 = '14px ui-monospace, SFMono-Regular, Menlo, monospace';

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('组件生命周期模拟：pipeline 的两种持有方式', 48, 40);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = mono14;
    drawingContext.fillText(
      `持有方式：${mode === 'singleton' ? '模块级单例' : '每次挂载重建'} · 挂载 ${mountCount} 次 · 已创建实例 ${instanceCount} 个`,
      48,
      68,
    );

    // 加载进度条：由 progress_callback 的聚合事件驱动
    if (status === 'loading') {
      drawingContext.fillStyle = '#e2e8f0';
      drawingContext.fillRect(48, 86, contentWidth, 14);
      drawingContext.fillStyle = '#4f7cff';
      drawingContext.fillRect(
        48,
        86,
        (contentWidth * Math.min(100, progress)) / 100,
        14,
      );
    }

    drawingContext.font = mono13;
    drawingContext.fillStyle = status === 'error' ? '#b91c1c' : '#475569';
    const messageLines = wrapText(message, contentWidth).slice(0, 3);
    messageLines.forEach((line, i) => {
      drawingContext.fillText(line, 48, 122 + i * 18);
    });

    // 挂载记录表：最近几次挂载的用时与来源
    const tableTop = 128 + messageLines.length * 18 + 16;
    drawingContext.fillStyle = '#475569';
    drawingContext.fillText('挂载', 48, tableTop);
    drawingContext.fillText('加载用时', 150, tableTop);
    drawingContext.fillText('来源', 300, tableTop);

    const maxRows = messageLines.length >= 3 ? 2 : 3;
    const shown = history.slice(-maxRows);
    shown.forEach((record, i) => {
      const y = tableTop + 22 + i * 22;
      drawingContext.fillStyle = '#172033';
      drawingContext.fillText(`#${record.index}`, 48, y);
      drawingContext.fillText(`${record.seconds.toFixed(1)} 秒`, 150, y);
      drawingContext.fillStyle = record.source === '复用单例' ? '#15803d' : '#1d4ed8';
      drawingContext.fillText(record.source, 300, y);
    });

    // 结论提示：随模式与挂载进度变化
    let hint: string;
    if (status === 'error') {
      hint = '切换「模拟卸载并重新挂载」可重试';
    } else if (mountCount >= 2 && mode === 'singleton') {
      hint = '第二次挂载约 0 秒——实例常驻模块作用域：跳过会话初始化，不占新内存';
    } else if (mountCount >= 2 && mode === 'rebuild') {
      hint = '第二次挂载命中缓存但仍要重建——会话初始化与内存按挂载次数重复付出';
    } else {
      hint = '就绪后切换「模拟卸载并重新挂载」，对照第二次挂载的加载用时';
    }
    drawingContext.fillStyle = '#475569';
    drawingContext.font = mono13;
    drawingContext.fillText(truncate(hint, contentWidth), 48, height - 12);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      if (disposed) {
        return;
      }
      const modeChanged = options.mode !== mode;
      const remountChanged = options.remount !== remount;
      mode = options.mode;
      remount = options.remount;
      if (!started || modeChanged) {
        // 首次 apply 或切换持有方式：从全新的"应用"开始
        started = true;
        reset();
        void mount();
        return;
      }
      if (remountChanged) {
        remountCycle();
        return;
      }
      draw();
    },
    dispose() {
      disposed = true;
      epoch += 1;
      resizeObserver.disconnect();
      moduleInstancePromise = null;
      componentInstance = null;
    },
  };
}
