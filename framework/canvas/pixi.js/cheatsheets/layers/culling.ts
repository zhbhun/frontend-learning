/**
 * 范例介绍：演示 culling 如何跳过视口外对象的渲染。
 *
 * 演示内容：一个比画布大的世界，铺满 16×16 = 256 个小方块，画布只显示中间一部分。world 缓慢
 * 左右平移，方块随之进出视口。每帧调用 Culler.shared.cull(world, app.screen)，开启 cullable 时
 * 视口外的方块被标记为剔除、渲染时跳过；关闭时全部恢复渲染。
 *
 * 输入：cullable（每个方块是否可被剔除）。
 * 主要操作：apply 把 cullable 映射到每个方块的 cell.cullable；ticker 里每帧都调用
 * Culler.shared.cull(world, app.screen)。读数用 bounds 与视口相交计数，反映「视口内对象数」和
 * 「被剔除对象数」，和 Culler 的判断逻辑一致。
 *
 * 预期结果：
 *   - 视口外方块本就不可见，所以开关 cullable 画面看起来一样——这正是剔除的价值：
 *     视口外的对象不会被渲染管线处理。
 *   - 读数「视口内」「已剔除」随 world 平移实时变化；cullable 关闭时「已剔除」恒为 0。
 *
 * 阅读主线：先看循环如何铺 256 个方块，再看 applyCull 如何切换每个方块的 cullable，最后看
 * ticker 里每帧的 Culler.shared.cull 调用与读数如何反映「视口外 = 被剔除」。
 */
import { Application, Container, Culler, Graphics, Rectangle, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface CullingOptions {
  cullable: boolean;
}

export interface CullingSnapshot {
  total: number;
  inView: number;
  culled: number;
  enabled: boolean;
}

export interface CullingInstance {
  update(options: CullingOptions): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

const COLS = 16;
const ROWS = 16;
const CELL = 26;
const GAP = 8;
const TOTAL = COLS * ROWS;

export function createCullingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CullingSnapshot) => void,
): CullingInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: CullingOptions = { cullable: true };
  // 视口矩形（screen 空间），cull 与读数计数都用它。
  const view = new Rectangle(0, 0, 1, 1);

  // world 作为剔除根：始终可剔除、始终递归到后代。控件切换的是每个方块的 cullable。
  const world = new Container();
  world.cullable = true;
  world.cullableChildren = true;

  const cells: Container[] = [];
  const step = CELL + GAP;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = new Container();
      const body = new Graphics();
      const shade = 0x1e293b;
      const lit = 0x4f7cff;
      body.roundRect(-CELL / 2, -CELL / 2, CELL, CELL, 5).fill({
        color: (c + r) % 2 === 0 ? lit : shade,
      });
      cell.addChild(body);
      cell.position.set(c * step + CELL / 2, r * step + CELL / 2);
      cell.cullable = true;
      cells.push(cell);
    }
  }
  world.addChild(...cells);

  const title = new Text({
    text: '视口剔除（Culling）',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5, 0);

  const hint = new Text({
    text: '视口外方块被剔除；读数随 world 平移实时变化',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  hint.anchor.set(0.5, 0);

  // 视口边框：让读者看到「什么是视口内」。
  const frame = new Graphics();

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    view.copyFrom(app.screen);
    const cx = w / 2;
    title.position.set(cx, h * 0.08);
    hint.position.set(cx, h * 0.08 + 24);
    // world 居中：让四周的方块落在视口外，剔除才有意义。
    world.position.set(cx - (COLS * step) / 2, h * 0.22);

    frame.clear();
    frame
      .rect(0, 0, w, h)
      .stroke({ color: 0xf59e0b, width: 2, alpha: 0.7 });
  }

  // 控件切换每个方块的 cullable。Culler 每帧都跑：开启时视口外的方块被标记剔除；
  // 关闭时 cullable=false 走 else 分支，Culler 把所有方块的 culled 重置为 false（恢复渲染）。
  function applyCull(opts: CullingOptions) {
    current = opts;
    for (const cell of cells) {
      cell.cullable = opts.cullable;
    }
  }

  // 用 bounds 与视口相交计数：逻辑与 Culler.shared.cull 一致，读数因此能诚实反映剔除集合。
  function countInView(): number {
    let n = 0;
    for (const cell of cells) {
      const b = cell.getBounds();
      if (
        b.x < view.x + view.width &&
        b.x + b.width > view.x &&
        b.y < view.y + view.height &&
        b.y + b.height > view.y
      ) {
        n++;
      }
    }
    return n;
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    preference: 'webgl',
    background: '#0f172a',
    antialias: true,
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(world, frame, title, hint);
    layout();
    applyCull(current);

    let emitAccum = 0;
    let t = 0;
    app.ticker.add((ticker) => {
      t += ticker.deltaMS / 1000;
      // world 缓慢左右平移，让方块进出视口、读数动态变化。
      const w = app.screen.width;
      const baseX = w / 2 - (COLS * step) / 2;
      world.x = baseX + Math.sin(t * 0.6) * 60;

      // 核心机制：每帧调用 Culler.shared.cull；按每个方块的 cullable 标志决定视口外对象是否剔除。
      Culler.shared.cull(world, view);

      // 读数节流到 ~100ms，避免每帧 emit 抢占主线程。
      emitAccum += ticker.deltaMS;
      if (emitAccum >= 100) {
        emitAccum = 0;
        const inView = countInView();
        emit({
          total: TOTAL,
          inView,
          culled: current.cullable ? TOTAL - inView : 0,
          enabled: current.cullable,
        });
      }
    });
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      if (entries.at(-1)?.isIntersecting) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  return {
    update(options) {
      applyCull(options);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
