/**
 * 范例介绍：「负载发生器」——Controls 的「任务负载」滑块设定每次注入主线程的
 * 同步阻塞时长；页面每约 4 秒自动注入一次（模拟后台任务）；「触发一次交互」
 * 按钮让读者做一次真实点击。
 * readout 全部是真实测量：一次交互的输入延迟 / 处理耗时 / 呈现延迟（INP 三阶段）、
 * 近 6 帧 rAF 间隔的 FPS 估计、超过 50ms 的长任务实测次数与最长耗时。
 * 前置状态：无需环境；证据同时在页内读数与 DevTools Performance 面板（Live metrics、
 *   Interactions 表、Main 轨道长任务红三角），先开面板再操作。
 * 主要操作：拖动「任务负载」滑块；点击「触发一次交互」按钮；录制 4–8 秒轨迹。
 * 预期结果：处理耗时 ≈ 滑块设定值，交互延迟为三段之和；负载越大 FPS 估计跌得越深、
 *   恢复越慢；Interactions 表逐条记录点击；Main 轨道出现带红三角的长任务。
 * 阅读主线：blockMainThread() 用确定性循环阻塞主线程设定时长——这就是 INP 与 TBT
 *   共同的根源「长任务」；measureClick() 用 event.timeStamp、performance.now() 与
 *   requestAnimationFrame 把一次点击拆成三阶段；FPS 估计来自渲染循环自身的 rAF
 *   间隔采样——主线程被阻塞时它最先感知。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

/** 演示页参数：每次注入主线程的同步阻塞时长（毫秒）。 */
export interface LoadSpecimenOptions {
  load: number;
}

export interface LoadSpecimenInstance {
  update(options: LoadSpecimenOptions): void;
  dispose(): void;
}

/** 心跳周期：每隔这么久自动注入一次长任务，模拟与交互无关的后台任务。 */
const HEARTBEAT_INTERVAL_MS = 4000;
/** 长任务判定阈值：超过 50ms 的任务会在 Main 轨道标红三角。 */
const LONG_TASK_THRESHOLD_MS = 50;
/** FPS 估计的采样窗口：取最近这么多个 rAF 帧间隔求平均。 */
const FPS_WINDOW_FRAMES = 6;

const SPECIMEN_STYLES = `
.load-specimen {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #e9eef4;
  color: #334155;
  font: 13px/1.6 ui-sans-serif, system-ui, sans-serif;
}
.load-specimen__main {
  flex: 1 1 300px;
  min-width: 0;
}
.load-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.load-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.load-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.load-specimen__trigger {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.load-specimen__load {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.load-specimen__readout {
  flex: 1 1 230px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-content: start;
  margin: 0;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.load-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.load-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

/**
 * 用确定性计算循环把主线程阻塞指定的时长，返回实测阻塞毫秒数。
 * 循环条件依赖 performance.now()，引擎无法把它优化掉；
 * 这就是「长任务」的最小实现——真实页面上它是开销大的回调或脚本。
 */
function blockMainThread(durationMs: number): number {
  const start = performance.now();
  let sink = 0;
  while (performance.now() - start < durationMs) {
    for (let i = 0; i < 1000; i += 1) {
      sink += Math.sqrt(i) % 7;
    }
  }
  return performance.now() - start;
}

export function createLoadSpecimen(
  root: HTMLElement,
): LoadSpecimenInstance {
  root.classList.add('load-specimen');
  root.innerHTML = `
    <div class="load-specimen__main">
      <p class="load-specimen__hint">负载发生器：先按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 DevTools 并切到 <b>Performance</b> 面板——打开即显示本地实时指标（Live metrics），无需录制。页面每约 4 秒自动阻塞主线程一次（模拟后台任务）；点下方按钮做一次真实点击，回面板看 <b>Interactions</b> 表与 Main 轨道的红三角长任务。离屏或切走标签页时循环暂停、FPS 读数冻结。</p>
      <div class="load-specimen__row">
        <button type="button" class="load-specimen__trigger">触发一次交互</button>
        <span>当前负载</span>
        <code class="load-specimen__load"></code>
      </div>
    </div>
    <dl class="load-specimen__readout">
      <dt>最近交互延迟</dt><dd class="load-specimen__cell-latency">—</dd>
      <dt>输入延迟</dt><dd class="load-specimen__cell-input">—</dd>
      <dt>处理耗时</dt><dd class="load-specimen__cell-processing">—</dd>
      <dt>呈现延迟</dt><dd class="load-specimen__cell-presentation">—</dd>
      <dt>FPS 估计</dt><dd class="load-specimen__cell-fps">—</dd>
      <dt>长任务</dt><dd class="load-specimen__cell-longtask">0 次</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const trigger = root.querySelector(
    '.load-specimen__trigger',
  ) as HTMLButtonElement;
  const loadLabel = root.querySelector(
    '.load-specimen__load',
  ) as HTMLElement;
  const cells = {
    latency: root.querySelector('.load-specimen__cell-latency') as HTMLElement,
    input: root.querySelector('.load-specimen__cell-input') as HTMLElement,
    processing: root.querySelector(
      '.load-specimen__cell-processing',
    ) as HTMLElement,
    presentation: root.querySelector(
      '.load-specimen__cell-presentation',
    ) as HTMLElement,
    fps: root.querySelector('.load-specimen__cell-fps') as HTMLElement,
    longTask: root.querySelector('.load-specimen__cell-longtask') as HTMLElement,
  };

  let load = 150;
  let heartbeatElapsed = 0;
  /* 最近 6 个 rAF 帧间隔（毫秒），用于 FPS 估计。 */
  const frameIntervals: number[] = [];
  let longTaskCount = 0;
  let longestLongTask = 0;
  /* 一次交互的三阶段实测值（毫秒）；未点击前保持 —。 */
  let latencyMs: number | undefined;
  let inputDelayMs: number | undefined;
  let processingMs: number | undefined;
  let presentationMs: number | undefined;

  function paint() {
    loadLabel.textContent = `${load} ms（滑块调节）`;
    cells.latency.textContent = latencyMs === undefined ? '—' : `${Math.round(latencyMs)} ms`;
    cells.input.textContent = inputDelayMs === undefined ? '—' : `${Math.round(inputDelayMs)} ms`;
    cells.processing.textContent = processingMs === undefined ? '—' : `${Math.round(processingMs)} ms`;
    cells.presentation.textContent = presentationMs === undefined ? '—' : `${Math.round(presentationMs)} ms`;
    cells.longTask.textContent =
      longTaskCount === 0
        ? '0 次'
        : `${longTaskCount} 次 · 最长 ${Math.round(longestLongTask)} ms`;
  }

  function paintFps() {
    if (frameIntervals.length < 2) {
      cells.fps.textContent = '—';
      return;
    }
    const spanMs = frameIntervals.reduce((sum, value) => sum + value, 0);
    if (spanMs <= 0) {
      return;
    }
    cells.fps.textContent = `${Math.round((frameIntervals.length * 1000) / spanMs)} 次/秒`;
  }

  function recordBlock(measuredMs: number) {
    if (measuredMs > LONG_TASK_THRESHOLD_MS) {
      longTaskCount += 1;
      longestLongTask = Math.max(longestLongTask, measuredMs);
      cells.longTask.textContent = `${longTaskCount} 次 · 最长 ${Math.round(longestLongTask)} ms`;
    }
  }

  /*
   * 一次真实点击的 INP 三阶段测量：
   * - 输入延迟：event.timeStamp（事件发生）到回调开始——主线程被占用时变大；
   * - 处理耗时：回调同步执行时长——回调里做重活时变大；
   * - 呈现延迟：回调结束到下一帧（rAF 时间戳）——渲染过重时变大。
   * 三段相加即「交互到下一次绘制」的实测延迟。
   */
  function measureClick(event: MouseEvent) {
    const inputStart = event.timeStamp;
    const handlerStart = performance.now();
    inputDelayMs = handlerStart - inputStart;
    const processingEnd = handlerStart + blockMainThread(load);
    processingMs = processingEnd - handlerStart;
    recordBlock(processingMs);
    requestAnimationFrame((frameTime) => {
      presentationMs = frameTime - processingEnd;
      latencyMs = frameTime - inputStart;
      paint();
    });
  }

  const renderLoop = createRenderLoop(root, (delta: number) => {
    const deltaMs = delta * 1000;
    if (deltaMs > 0) {
      frameIntervals.push(deltaMs);
      if (frameIntervals.length > FPS_WINDOW_FRAMES) {
        frameIntervals.shift();
      }
      paintFps();
    }

    /* 心跳：周期性注入一次与点击无关的长任务，先做 FPS 采样再阻塞。 */
    heartbeatElapsed += deltaMs;
    if (heartbeatElapsed >= HEARTBEAT_INTERVAL_MS) {
      heartbeatElapsed = 0;
      if (load > 0) {
        recordBlock(blockMainThread(load));
      }
    }
  });

  trigger.addEventListener('click', measureClick);
  paint();
  paintFps();

  return {
    update(options) {
      load = Math.max(0, options.load);
      paint();
    },
    dispose() {
      trigger.removeEventListener('click', measureClick);
      renderLoop.dispose();
    },
  };
}
