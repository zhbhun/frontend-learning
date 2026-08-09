/**
 * 范例介绍：演示「先画形、后上色」——先调用形状方法把几何累积到活动路径，再用 fill / stroke 上色。
 * 输入：形状类型（rect/roundRect/circle/ellipse/star）、描边宽度、描边对齐 alignment、填充透明度。
 * 主要操作：update 时 clear() 清空 → 按选中类型画形 → fill({ color, alpha }) → stroke({ width, color, alignment })。
 * 预期结果：切形状换几何；调描边宽度变粗；调对齐看到描边相对形状边界向某一侧偏移（0.5 居中）；改填充透明度看到半透明。
 * 阅读主线：先看 buildShape「画形 → fill → stroke」的顺序，对照 fill / stroke 样式对象字段，
 * 最后看 update 的热更新与 dispose 的资源释放、离屏暂停。
 */
import { Application, Graphics } from 'pixi.js';

export interface ShapeDemoArgs {
  shape: string;
  strokeWidth: number;
  alignment: number;
  fillAlpha: number;
}

export interface ShapeDemoSnapshot {
  shape: string;
  strokeWidth: number;
  alignment: number;
  fillAlpha: number;
}

export interface ShapeDemoInstance {
  update(args: ShapeDemoArgs): void;
  dispose(): void;
}

const SHAPE_LABELS: Record<string, string> = {
  rect: '矩形 rect',
  roundRect: '圆角矩形 roundRect',
  circle: '圆形 circle',
  ellipse: '椭圆 ellipse',
  star: '星形 star',
};

export function createShapeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShapeDemoSnapshot) => void,
): ShapeDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: ShapeDemoArgs = {
    shape: 'star',
    strokeWidth: 6,
    alignment: 0.5,
    fillAlpha: 0.65,
  };
  let shape: Graphics | null = null;

  // 先画形、后上色：形状方法只把几何累积到活动路径，fill / stroke 才给它上色。
  // 连续 fill + stroke 会自动复用同一条路径，不必重画。
  function buildShape(g: Graphics, args: ShapeDemoArgs) {
    g.clear();
    const size = Math.min(app.screen.width, app.screen.height) * 0.28;

    // 1) 画形——按选中类型调用对应形状方法，几何进入活动路径
    switch (args.shape) {
      case 'rect':
        g.rect(-size, -size * 0.7, size * 2, size * 1.4);
        break;
      case 'roundRect':
        g.roundRect(-size, -size * 0.7, size * 2, size * 1.4, size * 0.3);
        break;
      case 'circle':
        g.circle(0, 0, size);
        break;
      case 'ellipse':
        // radiusX / radiusY 即横向半径、纵向半径（半宽 / 半高）
        g.ellipse(0, 0, size, size * 0.65);
        break;
      case 'star':
      default:
        // star(x, y, points, radius, innerRadius)
        g.star(0, 0, 5, size, size * 0.45);
        break;
    }

    // 2) 后上色——fill / stroke 作用于上面刚画的几何
    g.fill({ color: 0x4f7cff, alpha: args.fillAlpha });
    g.stroke({
      width: args.strokeWidth,
      color: 0xf8fafc,
      alignment: args.alignment,
    });
  }

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      shape: SHAPE_LABELS[current.shape] ?? current.shape,
      strokeWidth: current.strokeWidth,
      alignment: current.alignment,
      fillAlpha: current.fillAlpha,
    });
  }

  app.init({
    canvas,
    background: '#1a1a2e',
    antialias: true,
    resizeTo: canvas.parentElement ?? window,
  })
    .then(() => {
      if (disposed) {
        app.destroy();
        return;
      }
      ready = true;

      shape = new Graphics();
      app.stage.addChild(shape);

      // 形状是静态的：每帧重新居中，保证画布尺寸变化时不跑偏。
      app.ticker.add(() => {
        if (!shape) {
          return;
        }
        shape.x = app.screen.width / 2;
        shape.y = app.screen.height / 2;
      });

      buildShape(shape, current);
      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
    });

  // 离屏时暂停渲染循环以省 GPU。
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
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      current = args;
      if (ready && shape) {
        buildShape(shape, args);
        emitSnapshot();
      }
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      if (ready) {
        app.destroy();
      }
    },
  };
}
