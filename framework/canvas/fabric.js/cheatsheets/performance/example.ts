/**
 * 范例介绍：性能压力实验台——核对 Fabric「单画布整帧重绘」的成本模型，以及缓存、视口剔除开关的收益与代价。
 * 1. 「拖动」：每帧 requestRenderAll 重画全部对象。缓存开启时逐对象贴图、「动画对象位图重画」不增长；
 *    关闭时逐对象现场画，帧耗时显著上升（对象越多差异越大）。
 * 2. 「缩放」：动画对象的位图尺寸随 scale 每帧变化，缓存开启反而每帧重建位图
 *    （noScaleCache 只保护鼠标手势，不覆盖程序缩放）；关闭缓存后回到与拖动接近的成本。
 * 3. 「跳过视口外」：布局把约一半对象放在视口右边界之外，skipOffscreen 决定它们是否参与整帧重绘。
 * 4. 测量：before:render 到 after:render（过滤上层 renderTop 派发的同名事件）之间的 performance.now 差值，
 *    统计近 60 帧均值与最大值；缓存内存按「外接框 × retina 倍率 × 4 字节」粗略估算。
 * 输入：对象数量（50/200/800）、对象缓存 objectCaching、运动方式（静止/拖动/缩放）、跳过视口外对象 skipOffscreen。
 * 预期结果：读数（整帧重绘次数 / 实际帧率 / 帧耗时 / 动画对象位图重画 / 缓存内存估算）随控件组合变化，逐项核对正文结论。
 * 阅读主线：buildScene() 的布局与批量构建技巧 → tick() 的三种运动分支 → after:render 钩子里的统计。
 */
import { Canvas, Path } from 'fabric';
import {
  createRenderLoop,
  createResizeObserver,
} from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface PerformanceOptions {
  /** 同构复杂路径对象的数量：50 / 200 / 800 */
  objectCount: number;
  /** 全部对象（含动画对象）的 objectCaching */
  objectCaching: boolean;
  /** static 不发起重绘；drag 模拟拖动（改 left/top）；scale 模拟持续缩放（改 scaleX/scaleY） */
  motion: 'static' | 'drag' | 'scale';
  /** canvas.skipOffscreen：整帧重绘时跳过完全在视口外的对象 */
  skipOffscreen: boolean;
}

/** 派生读数：由 readout 显示 */
export interface PerformanceSnapshot {
  objectCount: number;
  motionLabel: string;
  renderCount: number;
  fps: number;
  avgFrameMs: string;
  maxFrameMs: string;
  heroRepaints: number;
  heroCached: string;
  cacheMemory: string;
}

export interface PerformanceInstance {
  update(options: PerformanceOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const STAR_OUTER = 22;
const STAR_INNER = 9;
/** 8 瓣花 = 16 个顶点：现场画的开销足够明显，走缓存后只是一次 drawImage */
const PETALS = 8;
const PALETTE = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6'];
const HERO_FILL = '#e11d48';
const MOTION_LABELS: Record<PerformanceOptions['motion'], string> = {
  static: '静止',
  drag: '拖动',
  scale: '缩放',
};
/** 帧耗时统计窗口：近 60 帧 */
const FRAME_WINDOW = 60;

function createStarD(): string {
  const commands: string[] = [];
  const total = PETALS * 2;
  for (let i = 0; i < total; i += 1) {
    const radius = i % 2 === 0 ? STAR_OUTER : STAR_INNER;
    const angle = (i / total) * Math.PI * 2;
    const x = (Math.sin(angle) * radius).toFixed(2);
    const y = (-Math.cos(angle) * radius).toFixed(2);
    commands.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  return `${commands.join(' ')} Z`;
}

const STAR_D = createStarD();

/** 由索引派生的确定性伪随机（0..1）：保证每次重建布局一致，读数可复现 */
function jitter(index: number): number {
  const value = Math.sin(index * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

export function createPerformance(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: PerformanceSnapshot) => void,
): PerformanceInstance {
  // renderOnAddRemove 关闭：批量构建期间不产生自动重绘请求，刷新时机完全收归本例
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    renderOnAddRemove: false,
  });

  let current: PerformanceOptions = {
    objectCount: 200,
    objectCaching: true,
    motion: 'drag',
    skipOffscreen: true,
  };
  let stageSize = { ...INITIAL_SIZE };
  let hero: Path | null = null;
  let heroBase = { x: 0, y: 0 };
  /** 每个普通对象在布局中的归一化位置：fx 跨 0..2，约一半落在视口右边界之外 */
  let layout: Array<{ fx: number; fy: number }> = [];
  let phase = 0;

  // ---- 测量钩子：只统计下层整帧重绘（renderTop 只刷上层，也派发 after:render） ----
  let renderCount = 0;
  let frameStart = 0;
  const frameTimes: number[] = [];
  const renderTimestamps: number[] = [];
  let heroRepaints = 0;
  const mainCtx = fabricCanvas.getContext();

  fabricCanvas.on('before:render', ({ ctx }) => {
    if (ctx === mainCtx) {
      frameStart = performance.now();
    }
  });

  fabricCanvas.on('after:render', ({ ctx }) => {
    if (ctx !== mainCtx) {
      return; // 上层瞬态渲染不计入整帧成本
    }
    renderCount += 1;
    const now = performance.now();
    frameTimes.push(now - frameStart);
    if (frameTimes.length > FRAME_WINDOW) {
      frameTimes.shift();
    }
    renderTimestamps.push(now);
    while (
      renderTimestamps.length &&
      now - renderTimestamps[0] > 1000
    ) {
      renderTimestamps.shift();
    }
    emitSnapshot();
  });

  function trackHeroRepaints(target: Path) {
    const drawObject = target.drawObject.bind(target);
    target.drawObject = (ctx, forClipping, context) => {
      // drawObject 的两个入口：现场画（主画布上下文）与重画缓存位图（离屏上下文）
      if (ctx !== mainCtx) {
        heroRepaints += 1;
      }
      return drawObject(ctx, forClipping, context);
    };
  }

  function buildScene(count: number) {
    fabricCanvas.remove(...fabricCanvas.getObjects());
    const objects: Path[] = [];
    layout = [];
    // 布局横向铺到两倍视口宽：右侧一半初始就在视口之外，供 skipOffscreen 对比
    const spreadWidth = stageSize.width * 2;
    const cols = Math.max(
      1,
      Math.ceil(Math.sqrt((count * spreadWidth) / stageSize.height)),
    );
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i += 1) {
      const fx = (i % cols + 0.5) / cols + (jitter(i) - 0.5) * 0.02;
      const fy =
        (Math.floor(i / cols) + 0.5) / rows + (jitter(i + 9973) - 0.5) * 0.05;
      const scale = 0.7 + jitter(i + 51) * 0.7;
      layout.push({ fx, fy });
      objects.push(
        new Path(STAR_D, {
          left: fx * spreadWidth,
          top: fy * stageSize.height,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          angle: jitter(i + 7) * 360,
          fill: PALETTE[i % PALETTE.length],
          stroke: '#0f172a',
          strokeWidth: 1.5,
          objectCaching: current.objectCaching,
        }),
      );
    }
    hero = new Path(STAR_D, {
      left: stageSize.width * 0.3,
      top: stageSize.height * 0.5,
      originX: 'center',
      originY: 'center',
      scaleX: 1.6,
      scaleY: 1.6,
      fill: HERO_FILL,
      stroke: '#7f1d1d',
      strokeWidth: 2,
      objectCaching: current.objectCaching,
    });
    heroBase = { x: stageSize.width * 0.3, y: stageSize.height * 0.5 };
    trackHeroRepaints(hero);
    objects.push(hero);
    fabricCanvas.add(...objects);
    heroRepaints = 0;
    phase = 0;
  }

  function relayout() {
    const spreadWidth = stageSize.width * 2;
    const objects = fabricCanvas.getObjects();
    for (let i = 0; i < layout.length; i += 1) {
      objects[i].set({
        left: layout[i].fx * spreadWidth,
        top: layout[i].fy * stageSize.height,
      });
      // 程序改 left/top 后同步 oCoords，视口剔除（isOnScreen）的判断才不会过期
      objects[i].setCoords();
    }
    heroBase = { x: stageSize.width * 0.3, y: stageSize.height * 0.5 };
    if (hero) {
      hero.set({ left: heroBase.x, top: heroBase.y });
      hero.setCoords();
    }
  }

  function emitSnapshot() {
    if (!hero) {
      return;
    }
    // 缓存内存粗略估算：位图 ≈（外接框 + 描边）× retina 倍率，每像素 4 字节
    const retina = fabricCanvas.getRetinaScaling();
    let bytes = 0;
    for (const obj of fabricCanvas.getObjects()) {
      if (!obj.shouldCache()) {
        continue;
      }
      const w =
        Math.ceil(obj.getScaledWidth() + obj.strokeWidth) * retina;
      const h =
        Math.ceil(obj.getScaledHeight() + obj.strokeWidth) * retina;
      bytes += w * h * 4;
    }
    const avg = frameTimes.length
      ? frameTimes.reduce((sum, value) => sum + value, 0) / frameTimes.length
      : null;
    const max = frameTimes.length ? Math.max(...frameTimes) : null;
    emit({
      objectCount: fabricCanvas.getObjects().length,
      motionLabel: MOTION_LABELS[current.motion],
      renderCount,
      fps: renderTimestamps.length,
      avgFrameMs: avg === null ? '—' : `${avg.toFixed(1)} ms`,
      maxFrameMs: max === null ? '—' : `${max.toFixed(1)} ms`,
      heroRepaints,
      heroCached: hero.shouldCache() ? '是' : '否',
      cacheMemory:
        bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '0（未缓存）',
    });
  }

  // ---- 帧循环：离屏自动暂停，dispose 时随实例一起清理 ----
  const renderLoop = createRenderLoop(fabricCanvas.wrapperEl, (delta) => {
    // 帧率窗口的过期清理放在循环里：静止模式没有渲染事件，读数也要能自己归零
    const now = performance.now();
    while (
      renderTimestamps.length &&
      now - renderTimestamps[0] > 1000
    ) {
      renderTimestamps.shift();
    }
    emitSnapshot();
    if (!hero) {
      return;
    }
    phase += delta;
    if (current.motion === 'drag') {
      // 模拟拖拽：只改合成期属性（left/top），位图不需要重建
      hero.set({
        left: heroBase.x + Math.sin(phase * 1.6) * 70,
        top: heroBase.y + Math.sin(phase * 2.3) * 24,
      });
      hero.setCoords();
      fabricCanvas.requestRenderAll();
    } else if (current.motion === 'scale') {
      // 模拟持续缩放：位图尺寸随之每帧变化，缓存开启时每帧重建
      const s = 1.1 + Math.sin(phase * 1.8) * 0.5;
      hero.set({ scaleX: s, scaleY: s });
      hero.setCoords();
      fabricCanvas.requestRenderAll();
    }
    // static：什么都不做——静止场景不发起任何重绘请求
  });

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    stageSize = { width, height };
    relayout();
    // setDimensions 按当前 retina 倍率重设物理像素，并自动 requestRenderAll
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(options: PerformanceOptions) {
    const rebuild = options.objectCount !== current.objectCount;
    const cacheChanged = options.objectCaching !== current.objectCaching;
    current = options;
    fabricCanvas.skipOffscreen = options.skipOffscreen;
    if (rebuild) {
      buildScene(options.objectCount);
    } else if (cacheChanged) {
      for (const obj of fabricCanvas.getObjects()) {
        obj.set('objectCaching', options.objectCaching);
      }
    }
    // renderOnAddRemove 已关闭：每次控件变更后手动补一次整帧刷新
    fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  buildScene(current.objectCount);
  syncSize();

  return {
    update,
    dispose() {
      renderLoop.dispose();
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
