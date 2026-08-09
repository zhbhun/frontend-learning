/**
 * 渲染循环演示：delta time 如何让动画与帧率解耦，以及 start/stop、maxFPS、speed 的影响。
 *
 * 演示内容：两个并排旋转的指针。
 *   - 左侧（红）：每帧固定增量 rotation += 0.05（不乘 delta）。
 *   - 右侧（绿）：每帧增量 rotation += 0.05 * ticker.deltaTime（帧无关）。
 *
 * 输入：maxFPS（帧率上限）、speed（时间倍率）、paused（是否暂停 ticker）。
 * 主要操作：apply 把三个控件映射到 app.ticker.maxFPS / .speed，并按 paused 调 start/stop。
 *
 * 预期结果：
 *   - maxFPS=60 时两个指针转速接近；调低 maxFPS 后「原始」明显变慢，「delta 缩放」速度不变。
 *   - speed 只影响 delta 路径（speed 缩放 deltaTime，原始路径不读 deltaTime）。
 *   - paused=true 时整个渲染循环停止，两个指针都冻结，读数 FPS 归零。
 *
 * 阅读主线：先看 app.ticker.add 注册的逐帧回调里 raw 与 delta 两条分支，
 * 再看 applyOptions 如何映射三个控件，最后看 syncRunning 的启停与离屏暂停。
 */
import { Application, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TickerOptions {
  maxFPS: number;
  speed: number;
  paused: boolean;
}

export interface TickerSnapshot {
  fps: number;
  deltaTime: number;
  deltaMS: number;
}

export interface TickerInstance {
  update(options: TickerOptions): void;
  dispose(): void;
}

// 60fps 下两个指针每帧都推进 0.05 rad ≈ 3 rad/s；差异只在帧率变化时出现。
const RAW_RATE = 0.05; // 原始路径：每帧固定增量（rad）
const DELTA_RATE = 0.05; // delta 路径基准：每帧增量 × deltaTime（rad）
const RADIUS = 50;

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
} as const;

export function createTicker(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TickerSnapshot) => void,
): TickerInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: TickerOptions = { maxFPS: 60, speed: 1, paused: false };
  let userPaused = false;
  let onScreen = false;

  // 指针：从原点指向右侧的线段 + 顶端圆点。rotation=0 时朝右，rotation 绕原点旋转。
  function buildHand(color: number): Graphics {
    return new Graphics()
      .moveTo(0, 0)
      .lineTo(RADIUS, 0)
      .stroke({ color, width: 3 })
      .circle(RADIUS, 0, 6)
      .fill(color);
  }

  const rawHand = buildHand(0xef4444); // 红：原始（不乘 delta）
  const deltaHand = buildHand(0x22c55e); // 绿：delta 缩放

  const rawOrbit = new Graphics()
    .circle(0, 0, RADIUS)
    .stroke({ color: 0xef4444, alpha: 0.22, width: 1 });
  const deltaOrbit = new Graphics()
    .circle(0, 0, RADIUS)
    .stroke({ color: 0x22c55e, alpha: 0.22, width: 1 });

  const rawLabel = new Text({
    text: '原始：每帧 +0.05',
    style: { ...MONO, fill: 0xef4444 },
  });
  rawLabel.anchor.set(0.5, 0);
  const deltaLabel = new Text({
    text: 'delta：每帧 +0.05×deltaTime',
    style: { ...MONO, fill: 0x22c55e },
  });
  deltaLabel.anchor.set(0.5, 0);
  const hint = new Text({
    text: '调低「帧率上限」：左侧指针变慢，右侧不变',
    style: { ...MONO, fill: 0x94a3b8, fontSize: 11 },
  });
  hint.anchor.set(0.5, 0.5);

  // 根据画布尺寸重排两个圆心；指针位置随圆心更新，rotation 不受影响。
  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cy = h * 0.42;
    const leftX = w * 0.3;
    const rightX = w * 0.7;

    rawOrbit.position.set(leftX, cy);
    deltaOrbit.position.set(rightX, cy);
    rawHand.position.set(leftX, cy);
    deltaHand.position.set(rightX, cy);
    rawLabel.position.set(leftX, cy + RADIUS + 16);
    deltaLabel.position.set(rightX, cy + RADIUS + 16);
    hint.position.set(w / 2, 24);
  }

  // 把三个控件映射到 ticker API。
  function applyOptions(opts: TickerOptions) {
    current = opts;
    if (!ready) {
      return;
    }
    app.ticker.maxFPS = opts.maxFPS;
    app.ticker.speed = opts.speed;
    userPaused = opts.paused;
    syncRunning();
  }

  // 启停综合判断：离屏、用户暂停、页面隐藏，任一为真就停。
  function syncRunning() {
    if (!ready) {
      return;
    }
    const shouldRun =
      onScreen && !userPaused && document.visibilityState !== 'hidden';
    if (shouldRun && !app.ticker.started) {
      app.ticker.start();
    } else if (!shouldRun && app.ticker.started) {
      app.ticker.stop();
      // 停止后回调不再触发，主动发一帧读数让面板反映「已停止」。
      emit({ fps: 0, deltaTime: 0, deltaMS: 0 });
    }
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    antialias: true,
    backgroundAlpha: 0,
    preference: 'webgl',
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(
      rawOrbit,
      deltaOrbit,
      rawHand,
      deltaHand,
      rawLabel,
      deltaLabel,
      hint,
    );
    layout();

    // 核心机制：注册一个逐帧回调，里面两条分支对比帧无关与否。
    // ticker 回调的参数就是 Ticker 实例本身，直接读 deltaTime / deltaMS。
    app.ticker.add((t) => {
      rawHand.rotation += RAW_RATE; // 不乘 delta：帧率变了转速就变
      deltaHand.rotation += DELTA_RATE * t.deltaTime; // 乘 delta：帧率无关
      emit({
        fps: Math.round(t.FPS),
        deltaTime: Math.round(t.deltaTime * 100) / 100,
        deltaMS: Math.round(t.deltaMS * 10) / 10,
      });
    });

    applyOptions(current);
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  // 画布尺寸变化时同步 renderer 并重排。
  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  // 离屏暂停渲染循环以省 GPU；回到视口或页面可见时恢复。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      onScreen = entries.at(-1)?.isIntersecting ?? false;
      syncRunning();
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);
  document.addEventListener('visibilitychange', syncRunning);

  return {
    update(options) {
      applyOptions(options);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', syncRunning);
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
