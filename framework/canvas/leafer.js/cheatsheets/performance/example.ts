/**
 * 范例：性能优化——局部渲染的脏区合并、按需渲染与分层缓存的可观察效果。
 *
 * 演示内容：用一张由数百~两千个静态方块组成的网格作为「不参与重绘的背景成本」，
 *           再让其中少量方块持续闪烁。读者调节「动效元素分布」在集中 / 分散之间切换：
 *           集中时局部渲染（partRender）合并出的脏区很小、FPS 高；
 *           分散时 mergeBlocks 把各个闪烁方块合并成覆盖整张画布的大脏区、FPS 明显下降。
 *           关闭「局部渲染」后每帧全量重绘所有方块，FPS 进一步走低。
 *
 * 输入 / 前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM、CSS 100% 撑满舞台），
 *           直接作为 new Leafer({ view: canvas }) 的 view。
 *
 * 主要操作：
 *   1) new Leafer({ view, width, height, fill, maxFPS: 60, usePartRender }) 建立场景；
 *      field(Group) 装载全部方块，animatedCells 是当前正在闪烁的子集。
 *   2) createRenderLoop 驱动每帧改写 animatedCells 的 opacity 制造持续变化 → Leafer watcher
 *      自动请求按需渲染；循环在画布离屏或页面隐藏时自动暂停（见 canvas-runtime.js）。
 *   3) 轮询 leafer.FPS / leafer.renderer.totalTimes / 运行状态，并按 animatedCells 的网格位置
 *      预算「脏区覆盖占比」（mergeBlocks 合并后的大致覆盖范围），一起 emit 给 readout。
 *   4) update(options)：count 变化重建方块并重排；spread 变化只重选闪烁子集；
 *      usePartRender 直接写 leafer.config（与 leafer.renderer.config 同一引用，下一帧生效）。
 *
 * 预期结果：
 *   - 固定 count=800，把「动效分布」从集中切到分散 → 脏区覆盖从个位数跳到接近 100%，实测 FPS 同步下跌。
 *   - 关闭「局部渲染」→ 每帧全量重绘，FPS 比集中+局部渲染时低一截，且不再随分布变化。
 *   - 增大 count → 静态方块变多；局部渲染开启时静态方块不参与重绘，FPS 几乎不动；
 *     关闭局部渲染时全量重绘成本随 count 上涨，FPS 跟着下降。
 *   - 打开「显示重绘区」→ Debug.showRepaint 把每帧真正重绘的脏区涂上半透明色块：
 *     集中分布时只见角落小色块、分散分布时色块铺满整画布、关闭局部渲染时整张画布每帧都被涂满。
 *
 * 阅读主线：createPerformance 建场景 → buildCells / layoutField / selectAnimated 组装网格与闪烁子集
 *           → renderLoop 驱动变化 + poll 读数 → update 适配输入 → dispose 回收。
 */
import { Leafer, Group, Rect, Debug } from 'leafer-ui';
import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PerformanceSpread = 'cluster' | 'scatter';

export interface PerformanceOptions {
  /** 静态方块总数（闪烁子集另取一小撮）。 */
  count: number;
  /** 闪烁方块的分布方式：集中（聚成一角）/ 分散（均匀散布全画布）。 */
  spread: PerformanceSpread;
  /** 是否开启局部渲染 usePartRender。 */
  usePartRender: boolean;
  /** 是否用 Debug.showRepaint 把每帧重绘的脏区涂上颜色，直观看清「到底画了哪一块」。 */
  showRepaint: boolean;
}

export interface PerformanceSnapshot {
  /** 当前方块总数。 */
  count: number;
  /** 正在闪烁的方块数。 */
  animated: number;
  /** 局部渲染开关。 */
  partRender: boolean;
  /** 合并脏区覆盖画布的百分比（预算值）。 */
  coverage: number;
  /** Leafer 的实测 FPS（滚动均值，仅渲染时采样）。 */
  fps: number;
  /** 累计出帧数（判断是否仍在出帧的可靠指标）。 */
  totalTimes: number;
  /** renderer 当前状态。 */
  state: string;
  /** 是否正在可视化重绘区。 */
  showRepaint: boolean;
}

export interface PerformanceInstance {
  update(options: PerformanceOptions): void;
  dispose(): void;
}

// 闪烁子集上限：无论 count 多大，每帧只改写少量方块，保证「驱动变化」本身不成为瓶颈，
// 这样 FPS 的差异完全来自重绘范围（脏区大小）而非属性写入数量。
const MAX_ANIMATED = 60;
const PADDING = 20;
const GAP = 2;

export function createPerformance(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PerformanceSnapshot) => void,
): PerformanceInstance {
  const initial = readCanvasSize(canvas);

  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
    // 观察基线设为 60；库源码默认 120，受显示器刷新率约束（见渲染后端课参考表）。
    maxFPS: 60,
    usePartRender: true,
  });

  // Debug.showRepaint 是跨实例的全局标志：进入本范例前先复位，避免上个 story 残留的重绘高亮干扰。
  Debug.showRepaint = false;

  // 装载全部方块的容器。方块本身都是静态矩形，成本最低，用来放大「全量 vs 局部」重绘的差异。
  const field = new Group({ x: 0, y: 0 });
  leafer.add(field);

  let cells: Rect[] = [];
  let animatedIndices: number[] = [];
  // 网格位置缓存：与 cells 一一对应的画布坐标矩形，用于预算合并脏区覆盖，避免触碰 leafer 内部字段。
  let gridRects: { x: number; y: number; w: number; h: number }[] = [];
  let coverage = 0;

  let lastSpread: PerformanceSpread = 'cluster';
  let elapsed = 0;
  // Debug.showRepaint 是全局静态标志，开 true 后渲染器会在每个脏区上涂半透明色块。
  // 这里用局部变量镜像它的当前值给 readout，离开范例时再复位为 false，避免影响其它 story。
  let showRepaint = false;

  function buildCells(count: number) {
    if (cells.length) {
      field.removeAll(true);
    }
    cells = [];
    gridRects = [];
    for (let i = 0; i < count; i++) {
      const cell = new Rect({ fill: '#dbe3f0', hittable: false });
      field.add(cell);
      cells.push(cell);
      gridRects.push({ x: 0, y: 0, w: 0, h: 0 });
    }
  }

  function layoutField() {
    const { width, height } = readCanvasSize(canvas);
    const n = cells.length;
    if (n === 0) return;

    const availW = Math.max(1, width - PADDING * 2);
    const availH = Math.max(1, height - PADDING * 2);
    const aspect = width / height;
    const cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const cellW = Math.max(2, availW / cols - GAP);
    const cellH = Math.max(2, availH / rows - GAP);
    const size = Math.max(2, Math.min(cellW, cellH));

    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const x = PADDING + c * (cellW + GAP) + (cellW - size) / 2;
      const y = PADDING + r * (cellH + GAP) + (cellH - size) / 2;
      cells[i].set({ x, y, width: size, height: size });
      gridRects[i] = { x, y, w: size, h: size };
    }
  }

  function selectAnimated(spread: PerformanceSpread) {
    const n = cells.length;
    const m = Math.min(n, MAX_ANIMATED);

    // 先把所有方块恢复为静态底色，再给被选中的子集上闪烁色。
    for (let i = 0; i < n; i++) {
      cells[i].set({ fill: '#dbe3f0', opacity: 1 });
    }

    animatedIndices = [];
    if (m === 0) {
      coverage = 0;
      return;
    }

    if (spread === 'cluster') {
      // 集中：取索引 0..m-1，位于网格左上角，合并脏区是紧致的小矩形。
      for (let k = 0; k < m; k++) animatedIndices.push(k);
    } else {
      // 分散：等间距采样，散布到整张画布，合并脏区会膨胀到接近全屏。
      const step = n / m;
      for (let k = 0; k < m; k++) {
        animatedIndices.push(Math.min(n - 1, Math.floor(k * step)));
      }
    }

    for (const i of animatedIndices) {
      cells[i].set({ fill: '#4f7cff' });
    }

    // 预算合并脏区覆盖：等价于 mergeBlocks 把所有闪烁方块的 renderBounds 合并成一个大矩形。
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of animatedIndices) {
      const g = gridRects[i];
      if (!g) continue;
      minX = Math.min(minX, g.x);
      minY = Math.min(minY, g.y);
      maxX = Math.max(maxX, g.x + g.w);
      maxY = Math.max(maxY, g.y + g.h);
    }
    const { width, height } = readCanvasSize(canvas);
    const coverW = Math.max(0, maxX - minX);
    const coverH = Math.max(0, maxY - minY);
    const area = width > 0 && height > 0 ? width * height : 1;
    coverage = Math.max(0, Math.min(1, (coverW * coverH) / area));
  }

  // 初始化默认场景（与 stories 的默认 args 对齐）。
  buildCells(800);
  layoutField();
  selectAnimated('cluster');

  // 驱动循环：每帧给闪烁方块写一个新的 opacity，制造持续的数据变化。
  // createRenderLoop 已内置 IntersectionObserver + visibilitychange：画布离屏或页面隐藏时自动暂停。
  const renderLoop = createRenderLoop(canvas, (delta: number) => {
    elapsed += delta;
    const phase = elapsed * 2.4;
    for (let k = 0; k < animatedIndices.length; k++) {
      const cell = cells[animatedIndices[k]];
      if (!cell) continue;
      // 0.45 ~ 1.0 之间正弦呼吸；每帧值不同 → watcher 标记变化 → 触发一次按需渲染。
      cell.opacity = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(phase + k * 0.45));
    }
  });

  // 读数轮询：独立于 Leafer 的渲染节奏上报 FPS / 累计帧数 / 状态 / 脏区覆盖。
  const poll = window.setInterval(() => {
    const renderer = leafer.renderer;
    let state: string;
    if (!renderer.running) {
      state = '已停止';
    } else if (renderer.rendering) {
      state = '渲染中';
    } else if (renderer.changed) {
      state = '等待帧';
    } else {
      state = '空闲';
    }

    emit({
      count: cells.length,
      animated: animatedIndices.length,
      partRender: Boolean(leafer.config.usePartRender),
      coverage: Math.round(coverage * 100),
      fps: leafer.FPS,
      totalTimes: renderer.totalTimes,
      state,
      showRepaint,
    });
  }, 200);

  function applySize() {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    layoutField();
    selectAnimated(lastSpread);
  }

  const resizeObserver = createResizeObserver(canvas, applySize);

  return {
    update(options) {
      // leafer.config 与 leafer.renderer.config 是同一对象引用，运行时改写立即生效。
      leafer.config.usePartRender = options.usePartRender;
      // showRepaint 是 Debug 的全局开关：渲染器每画完一个脏区就给它涂一层半透明色。
      showRepaint = options.showRepaint;
      Debug.showRepaint = showRepaint;

      if (options.count !== cells.length) {
        buildCells(options.count);
        layoutField();
        selectAnimated(options.spread);
      } else if (options.spread !== lastSpread) {
        selectAnimated(options.spread);
      }
      lastSpread = options.spread;
    },
    dispose() {
      // 复位全局 Debug 标志，避免本范例的重绘高亮泄漏到其它 story。
      Debug.showRepaint = false;
      window.clearInterval(poll);
      renderLoop.dispose();
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
