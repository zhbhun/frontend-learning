/**
 * 范例介绍：「工作负载标本」——Controls 的「负载类型」切换三种可复现负载：
 * script（长脚本任务，一段纯 JS 忙等）、thrash（布局抖动，读布局→写样式交替）、
 * mixed（混合：脚本 → 三条同源请求 → 抖动）；点「执行一次操作」跑一次并实测。
 * readout：本次耗时（整次操作全程）、长任务累计数（PerformanceObserver 统计 >50ms）、
 * 强制布局次数（最近一次抖动的读-写往返数）、Timings 标记（每次操作写入
 * performance.mark 与 performance.measure，在 Timings 轨道显示为标记与黄色区段）。
 * 前置状态：无需环境；证据同时在页内读数与 DevTools Performance 面板（Timings、
 * Main、Network、Interactions、Frames 轨道），先开面板再 Record。
 * 主要操作：Record → 点「执行一次操作」→ Stop；用 readout 的耗时作锚点，
 * 在 Timings 轨道与 Main 火焰图里定位这次操作。
 * 预期结果：script → 一条约 250ms 的长任务（红三角）；thrash → 同一条任务内部
 * 黄紫交替锯齿、Layout 事件带红三角；mixed → 两条长任务 + Network 三条请求。
 * 阅读主线：busyBlock() 用确定性忙等独占主线程——长任务本体；layoutThrash() 的
 * 读-写交替让每次读都触发强制同步布局——锯齿的成因；runWorkload() 用 mark/measure
 * 把操作边界写进 Timings 轨道，作为录制里的路标。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

/** 负载类型：Controls 的「负载类型」单选值。 */
export type WorkloadKind = 'script' | 'thrash' | 'mixed';

export interface WorkloadSpecimenOptions {
  workload: WorkloadKind;
}

export interface WorkloadInstance {
  update(options: WorkloadSpecimenOptions): void;
  dispose(): void;
}

/** 单段负载的目标时长（毫秒）：明显高于 50ms 长任务线，火焰图形态清晰。 */
const WORKLOAD_DURATION_MS = 250;
/** 混合负载中两段主线程工作各自的目标时长（毫秒）。 */
const MIXED_SCRIPT_MS = 100;
const MIXED_THRASH_MS = 120;
/** 混合负载发出的同源请求数：让 Network 轨道有内容可读。 */
const MIXED_FETCH_COUNT = 3;
/** 布局网格的元素数：足够让每次强制重排都有可测成本。 */
const GRID_CELL_COUNT = 192;
/** 动画圆点直径（像素），用于计算平移幅度。 */
const DOT_SIZE_PX = 16;

/** 负载类型的中文标签，stories 用它生成带中文标签的单选控件。 */
export const WORKLOAD_LABELS: Record<WorkloadKind, string> = {
  script: '长脚本任务',
  thrash: '布局抖动',
  mixed: '混合负载',
};

const SPECIMEN_STYLES = `
.workload-specimen {
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
.workload-specimen__main {
  flex: 1 1 320px;
  min-width: 0;
}
.workload-specimen__hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #5d6f67;
}
.workload-specimen__hint code {
  padding: 0 3px;
  border-radius: 3px;
  background: #dbe3f0;
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.workload-specimen__strip {
  position: relative;
  height: 30px;
  margin-bottom: 10px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
  overflow: hidden;
}
.workload-specimen__dot {
  position: absolute;
  top: 6px;
  left: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4f7cff;
}
.workload-specimen__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b9c6e0;
  border-radius: 6px;
  background: rgb(255 255 255 / 85%);
}
.workload-specimen__trigger {
  padding: 6px 14px;
  border: 1px solid #4f7cff;
  border-radius: 6px;
  background: #4f7cff;
  color: #fff;
  font: 600 13px ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.workload-specimen__trigger:disabled {
  opacity: 0.55;
  cursor: default;
}
.workload-specimen__load {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #172033;
}
.workload-specimen__grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  height: 128px;
  margin-top: 10px;
  overflow: hidden;
}
.workload-specimen__cell {
  padding: 2px 4px;
  border-radius: 3px;
  background: #dfe7f2;
  color: #5d6f67;
  font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.workload-specimen__readout {
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
.workload-specimen__readout dt {
  color: #5d6f67;
  white-space: nowrap;
}
.workload-specimen__readout dd {
  margin: 0;
  color: #172033;
  text-align: right;
}
`;

export function createWorkloadSpecimen(
  root: HTMLElement,
): WorkloadInstance {
  root.classList.add('workload-specimen');
  root.innerHTML = `
    <div class="workload-specimen__main">
      <p class="workload-specimen__hint">工作负载标本：先按 <code>Command+Option+J</code>（macOS）或 <code>Control+Shift+J</code>（Windows、Linux）打开 DevTools 的 <b>Performance</b> 面板，点 <b>Record</b> 后再点下方按钮，readout 刷新后点 <b>Stop</b>。圆点动画让空闲时也有帧可录，离屏或切走标签页时循环暂停；标本跑在 iframe 里，长任务出现在对应 iframe 分组的 Main 轨道。</p>
      <div class="workload-specimen__strip"><span class="workload-specimen__dot"></span></div>
      <div class="workload-specimen__row">
        <button type="button" class="workload-specimen__trigger">执行一次操作</button>
        <span>当前负载</span>
        <code class="workload-specimen__load"></code>
      </div>
      <div class="workload-specimen__grid"></div>
    </div>
    <dl class="workload-specimen__readout">
      <dt>本次耗时</dt><dd class="workload-specimen__cell-duration">—</dd>
      <dt>长任务（累计）</dt><dd class="workload-specimen__cell-longtask">0 个</dd>
      <dt>强制布局（最近一次）</dt><dd class="workload-specimen__cell-forced">—</dd>
      <dt>Timings 标记</dt><dd class="workload-specimen__cell-timings">—</dd>
    </dl>
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = SPECIMEN_STYLES;
  root.append(styleEl);

  const strip = root.querySelector(
    '.workload-specimen__strip',
  ) as HTMLElement;
  const dot = root.querySelector('.workload-specimen__dot') as HTMLElement;
  const trigger = root.querySelector(
    '.workload-specimen__trigger',
  ) as HTMLButtonElement;
  const loadLabel = root.querySelector(
    '.workload-specimen__load',
  ) as HTMLElement;
  const grid = root.querySelector(
    '.workload-specimen__grid',
  ) as HTMLElement;
  const cells = {
    duration: root.querySelector(
      '.workload-specimen__cell-duration',
    ) as HTMLElement,
    longTask: root.querySelector(
      '.workload-specimen__cell-longtask',
    ) as HTMLElement,
    forced: root.querySelector(
      '.workload-specimen__cell-forced',
    ) as HTMLElement,
    timings: root.querySelector(
      '.workload-specimen__cell-timings',
    ) as HTMLElement,
  };

  /* 布局网格：抖动负载的重排对象。元素数固定，单次重排成本稳定。 */
  for (let i = 0; i < GRID_CELL_COUNT; i += 1) {
    const cell = document.createElement('span');
    cell.className = 'workload-specimen__cell';
    cell.textContent = `#${i}`;
    grid.append(cell);
  }

  let workload: WorkloadKind = 'mixed';
  let running = false;
  let runId = 0;
  let lastDurationMs: number | undefined;
  let forcedLayoutRounds: number | undefined;
  let longTaskCount = 0;

  function paint() {
    loadLabel.textContent = `${WORKLOAD_LABELS[workload]}（Controls 调节）`;
    cells.duration.textContent =
      lastDurationMs === undefined ? '—' : `${Math.round(lastDurationMs)} ms`;
    cells.longTask.textContent = `${longTaskCount} 个`;
    cells.forced.textContent =
      forcedLayoutRounds === undefined ? '—' : `${forcedLayoutRounds} 次`;
    cells.timings.textContent = runId === 0 ? '—' : `workload-${runId}`;
    trigger.disabled = running;
  }

  /* 长任务实测：超过 50ms 的任务各计一条，与 Main 轨道的红三角同源。 */
  const longTaskObserver = new PerformanceObserver((list) => {
    longTaskCount += list.getEntries().length;
    paint();
  });
  longTaskObserver.observe({ entryTypes: ['longtask'] });

  /**
   * 确定性忙等：把主线程独占指定时长，返回实测毫秒数。
   * 这是「长脚本任务」的最小实现——火焰图里是一条带红三角的长任务，
   * Bottom-Up 按 Self time 排序时 busyBlock 排在最前。
   */
  function busyBlock(durationMs: number): number {
    const start = performance.now();
    let sink = 0;
    while (performance.now() - start < durationMs) {
      for (let i = 0; i < 1000; i += 1) {
        sink += Math.sqrt(i) % 7;
      }
    }
    return performance.now() - start;
  }

  /**
   * 布局抖动：循环「读 offsetWidth → 写 margin」。
   * 写让布局失效，下一次读被迫同步重排（forced synchronous layout），
   * 火焰图里呈黄紫交替锯齿，Layout 事件带红三角。
   * 按时长驱动并返回往返次数：机器越快，同样时长里的强制布局越多，
   * 但总时长稳定，录出来的轨迹可以跨读者比对。
   */
  function layoutThrash(durationMs: number): number {
    const start = performance.now();
    let rounds = 0;
    let margin = 0;
    while (performance.now() - start < durationMs) {
      /* 读：上一次写已让布局失效，这里被迫同步重排。 */
      if (grid.offsetWidth < 0) {
        break; /* 永不成立——只为让这次布局读取无法被引擎省略。 */
      }
      /* 写：margin 不改变 offsetWidth 的构成，循环不会收敛；
         每次写入都让布局再次失效，给下一次读埋雷。 */
      margin = (margin + 4) % 40;
      grid.style.marginLeft = `${margin}px`;
      rounds += 1;
    }
    grid.style.marginLeft = '0px';
    return rounds;
  }

  /**
   * 同源请求组：每条 URL 不同且禁用缓存，保证每次都真实经过网络层，
   * Network 轨道才有完整的「排队 → 等待 → 下载」一生可读。
   */
  async function fetchBundle(): Promise<void> {
    const requests: Promise<unknown>[] = [];
    for (let i = 0; i < MIXED_FETCH_COUNT; i += 1) {
      const url = new URL(location.href);
      url.searchParams.set('workload-fetch', `${runId}-${i}`);
      const task = fetch(url, { cache: 'no-store' })
        .then((response) => response.text())
        .catch(() => undefined);
      requests.push(task);
    }
    await Promise.all(requests);
  }

  /** 一次操作：按当前负载类型注入工作，并把边界写进 Timings 轨道。 */
  async function runWorkload(): Promise<void> {
    if (running) {
      return;
    }
    running = true;
    runId += 1;
    forcedLayoutRounds = undefined;
    trigger.disabled = true;

    const startMark = `workload-${runId}-start`;
    const endMark = `workload-${runId}-end`;
    performance.mark(startMark);
    const startedAt = performance.now();

    if (workload === 'script') {
      busyBlock(WORKLOAD_DURATION_MS);
    } else if (workload === 'thrash') {
      forcedLayoutRounds = layoutThrash(WORKLOAD_DURATION_MS);
    } else {
      busyBlock(MIXED_SCRIPT_MS);
      await fetchBundle();
      forcedLayoutRounds = layoutThrash(MIXED_THRASH_MS);
    }

    lastDurationMs = performance.now() - startedAt;
    performance.mark(endMark);
    performance.measure(`workload-${runId}`, startMark, endMark);

    running = false;
    paint();
  }

  function onTriggerClick(): void {
    void runWorkload();
  }
  trigger.addEventListener('click', onTriggerClick);

  /* 圆点动画：transform 不触碰布局，空闲时提供小帧任务；
     主线程被长任务独占时帧骤停——Frames 轨道里看得到。 */
  let phase = 0;
  const renderLoop = createRenderLoop(root, (delta: number) => {
    if (delta <= 0) {
      return;
    }
    phase += delta * 1.8;
    const span = Math.max(0, strip.clientWidth - DOT_SIZE_PX);
    const progress = (Math.sin(phase) + 1) / 2;
    dot.style.transform = `translateX(${Math.round(progress * span)}px)`;
  });

  paint();

  return {
    update(options) {
      workload = options.workload;
      paint();
    },
    dispose() {
      trigger.removeEventListener('click', onTriggerClick);
      longTaskObserver.disconnect();
      renderLoop.dispose();
    },
  };
}
