/**
 * 范例介绍：演示自由路径——用 moveTo + bezierCurveTo 拼出曲线轮廓，再用 fill / stroke 上色、用 cut 挖洞。
 * 输入：填充开关、描边开关、挖洞开关。
 * 主要操作：update 时 clear() → 按开关分别重画心形路径并 fill（含 cut 圆洞）/ stroke。
 * 预期结果：开填充看到实心心形；开描边看到轮廓；开挖洞在填充区出现一个透明圆洞（cut 作用于前面的填充几何）。
 * 阅读主线：先看 drawHeart 如何用 moveTo + 两条三次贝塞尔拼出路径，再看 fill / stroke / cut 如何各自作用于路径，
 * 最后看 update 的热更新与 dispose 的释放。
 */
import { Application, Graphics } from 'pixi.js';

export interface PathDemoArgs {
  fill: boolean;
  stroke: boolean;
  cut: boolean;
}

export interface PathDemoSnapshot {
  fill: string;
  stroke: string;
  cut: string;
}

export interface PathDemoInstance {
  update(args: PathDemoArgs): void;
  dispose(): void;
}

export function createPathDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PathDemoSnapshot) => void,
): PathDemoInstance {
  const app = new Application();

  let disposed = false;
  let ready = false;
  let current: PathDemoArgs = { fill: true, stroke: true, cut: true };
  let path: Graphics | null = null;

  // 用 moveTo + 两条三次贝塞尔曲线拼一个心形轮廓，closePath 闭合。
  // bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)：两个控制点 + 终点。
  function drawHeart(g: Graphics, s: number) {
    g.moveTo(0, -s * 0.3);
    g.bezierCurveTo(-s * 0.5, -s * 0.9, -s * 1.1, -s * 0.05, 0, s * 0.8);
    g.bezierCurveTo(s * 1.1, -s * 0.05, s * 0.5, -s * 0.9, 0, -s * 0.3);
    g.closePath();
  }

  function buildPath(g: Graphics, args: PathDemoArgs) {
    g.clear();
    const s = Math.min(app.screen.width, app.screen.height) * 0.24;

    // 填充分支：画心形 → fill →（可选）画圆洞并 cut。
    // cut 作用于「前面的填充几何」，所以必须先有 fill 才看得见洞。
    if (args.fill) {
      drawHeart(g, s);
      g.fill({ color: 0xff5a7a, alpha: 0.9 });
      if (args.cut) {
        g.circle(0, -s * 0.05, s * 0.18);
        g.cut();
      }
    }

    // 描边分支：重画一遍心形并 stroke，让轮廓与填充互不影响。
    if (args.stroke) {
      drawHeart(g, s);
      g.stroke({ width: 4, color: 0xf8fafc });
    }
  }

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      fill: current.fill ? '开' : '关',
      stroke: current.stroke ? '开' : '关',
      cut: current.cut ? '有洞' : '无洞',
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

      path = new Graphics();
      app.stage.addChild(path);

      app.ticker.add(() => {
        if (!path) {
          return;
        }
        path.x = app.screen.width / 2;
        path.y = app.screen.height / 2;
      });

      buildPath(path, current);
      emitSnapshot();
    })
    .catch(() => {
      // 渲染器初始化失败时画布保持空白。
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
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(args) {
      current = args;
      if (ready && path) {
        buildPath(path, args);
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
