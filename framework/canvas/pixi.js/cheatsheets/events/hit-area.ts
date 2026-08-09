/**
 * 范例介绍：演示 hitArea 如何让「命中区域」与「可见形状」分离。
 *
 * 场景：一个可见的五角星（eventMode = 'static'），它实际接收点击的区域由 hitArea 决定。
 * 输入：hitArea 模式——
 *   - bounds：清空 hitArea，用默认的几何包围盒（矩形）
 *   - circle：圆形命中区（内切于包围盒，星形尖端落在区外）
 *   - rectangle：一个明显比星形扁的矩形命中区
 *   - polygon：精确按星形顶点构造的多边形命中区
 * 主要操作：移动指针看「是否在命中区域内」；在星形尖端 / 凹陷处按下验证。
 *
 * 预期结果：指针落在星形可见像素上但处于命中区外时（如 circle 模式下的星尖），
 * 读数显示「不在命中区域内」，按下也不会命中星形——证明命中区 ≠ 可见区。
 *
 * 阅读主线：先看 buildStarPoints 与各模式如何构造 region 并赋给 star.hitArea，
 * 再看 ticker 如何用 region.contains 判定指针是否在命中区，最后看命中区轮廓的绘制。
 */
import {
  Application,
  Circle,
  Graphics,
  Polygon,
  Rectangle,
  Text,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type HitAreaMode = 'bounds' | 'circle' | 'rectangle' | 'polygon';

export interface HitAreaArgs {
  mode: HitAreaMode;
}

export interface HitAreaSnapshot {
  mode: string;
  inRegion: string;
}

export interface HitAreaInstance {
  update(args: HitAreaArgs): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
} as const;

const OUTER = 60;
const INNER = 26;
// 圆形命中区半径：刻意小于外径，让星形尖端落在圆外，直观展示命中区 ≠ 可见区。
const CIRCLE_R = 42;

// 生成五角星顶点（交替外 / 内半径），原点在星形中心。
function buildStarPoints(): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? OUTER : INNER;
    pts.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return pts;
}

// 星形的紧包围盒：bounds 模式下 hitArea=null，命中测试回落到这个默认包围盒。
const STAR_BOUNDS = (() => {
  const pts = buildStarPoints();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return new Rectangle(minX, minY, maxX - minX, maxY - minY);
})();

export function createHitAreaDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HitAreaSnapshot) => void,
): HitAreaInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: HitAreaArgs = { mode: 'circle' };
  let inRegion = false;

  const star = new Graphics();
  star.eventMode = 'static';
  const regionOutline = new Graphics(); // 命中区轮廓（可视化命中区与可见区的差异）
  const cursor = new Graphics();
  cursor.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.95 });

  const hint = new Text({
    text: '指针在星尖但读数「不在命中区域内」时，按下也不会命中星形',
    style: { ...MONO, fill: 0x94a3b8, fontSize: 11 },
  });
  hint.anchor.set(0.5, 1);

  // 当前命中区对象（实现 contains(x, y)）；bounds 模式下用包围盒矩形做手动判定
  let region: { contains(x: number, y: number): boolean } | null = null;

  function drawStar() {
    star.clear();
    star.poly(buildStarPoints()).fill({ color: 0x4f7cff, alpha: 0.9 });
    star.poly(buildStarPoints()).stroke({ color: 0xe2e8f0, width: 2 });
  }

  // 把命中区轮廓画出来，让读者直观看到「可命中范围」与「可见星形」是否重合。
  function drawRegionOutline() {
    regionOutline.clear();
    regionOutline.position.copyFrom(star.position);
    if (!region) {
      return;
    }
    if (current.mode === 'circle') {
      regionOutline.circle(0, 0, CIRCLE_R).stroke({ color: 0x22c55e, width: 1.5, alpha: 0.8 });
    } else if (current.mode === 'rectangle') {
      const rect = region as Rectangle;
      regionOutline
        .rect(rect.x, rect.y, rect.width, rect.height)
        .stroke({ color: 0x22c55e, width: 1.5, alpha: 0.8 });
    } else if (current.mode === 'bounds') {
      regionOutline
        .rect(STAR_BOUNDS.x, STAR_BOUNDS.y, STAR_BOUNDS.width, STAR_BOUNDS.height)
        .stroke({ color: 0xf59e0b, width: 1.5, alpha: 0.8 });
    } else {
      regionOutline
        .poly(buildStarPoints())
        .stroke({ color: 0x22c55e, width: 1.5, alpha: 0.8 });
    }
  }

  function applyArgs(args: HitAreaArgs) {
    current = args;
    // 根据模式构造命中区；bounds 清空 hitArea，回落到星形默认包围盒。
    if (args.mode === 'circle') {
      region = new Circle(0, 0, CIRCLE_R);
      star.hitArea = region;
    } else if (args.mode === 'rectangle') {
      region = new Rectangle(-OUTER, -INNER, OUTER * 2, INNER * 2);
      star.hitArea = region;
    } else if (args.mode === 'polygon') {
      region = new Polygon(buildStarPoints());
      star.hitArea = region;
    } else {
      // bounds：hitArea 置空 → 命中测试用星形几何包围盒；手动判定用紧包围盒矩形。
      region = STAR_BOUNDS;
      star.hitArea = null;
    }
    drawRegionOutline();
  }

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    star.position.set(w / 2, h / 2 - 12);
    hint.position.set(w / 2, h - 14);
    drawRegionOutline();
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
    drawStar();
    app.stage.addChild(regionOutline, star, cursor, hint);
    layout();
    applyArgs(current);

    // 每帧用 EventSystem 最近指针状态判定是否落在命中区内，并据此染色光标点。
    app.ticker.add(() => {
      const pointer = app.renderer.events.pointer;
      cursor.position.copyFrom(pointer.global);
      // 把世界坐标换算到星形本地坐标，再交给命中区的 contains 判定。
      const local = star.toLocal(pointer.global);
      inRegion = region ? region.contains(local.x, local.y) : false;
      cursor.tint = inRegion ? 0x22c55e : 0xffffff;
      emit({ mode: current.mode, inRegion: inRegion ? '是' : '否' });
    });
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height);
    layout();
  });

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      const visible = entries.at(-1)?.isIntersecting ?? false;
      if (visible) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  return {
    update(args) {
      if (ready) {
        applyArgs(args);
      } else {
        current = args;
      }
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
