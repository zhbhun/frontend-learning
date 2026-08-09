/**
 * 范例介绍：演示 tint 的乘法着色与继承，以及 Color 类如何把任意颜色输入统一转换。
 *
 * 演示内容：一个含白色与彩色图形 + 文字的场景，整体挂在一个 Container 上。
 *           给该容器设 tint，观察白色图形被「染」成目标色、彩色图形按乘法偏色；
 *           并用 Color 把当前 tint 转成多种格式作为读数。
 * 输入：tint（任意 CSS 颜色字符串，由 Storybook color 控件提供，证明 ColorSource 多格式）、
 *       强度（0~1，在白色与目标色间线性插值，模拟 tint 没有原生强度参数的常见需求）。
 * 主要操作：update 时用 Color 解析 tint，按强度与白色插值后赋给 scene.tint；
 *           readout 用 Color 的 toHex / toRgbaString / toNumber 展示统一转换。
 *
 * 预期结果：
 *   - tint=白色：场景不变（白色 = 无 tint，默认值）。
 *   - tint=红色：白色图形变红，彩色图形按乘法变暗偏红。
 *   - 强度=0：无论 tint 何色，都还原为白色（无 tint）。
 *   - 强度=1：完全应用 tint。
 *   - readout：hex / rgba / number 三种格式同步，证明 Color 把任意输入统一转换。
 *
 * 阅读主线：先看 buildScene 构造含白 + 彩色图形的场景（体现 tint 乘法本质），
 * 再看 applyTint 用 Color 解析并插值、设置 scene.tint，
 * 最后看 describeColor 用 Color 多种 toXxx 方法做转换展示。
 */
import {
  Application,
  Container,
  Graphics,
  Text,
  Color,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TintColorArgs {
  tint: string;
  strength: number;
}

export interface TintColorSnapshot {
  hex: string;
  rgba: string;
  number: string;
  strength: number;
}

export interface TintColorInstance {
  update(args: TintColorArgs): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
} as const;

export function createTintColorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TintColorSnapshot) => void,
): TintColorInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: TintColorArgs = {
    tint: '#ffffff',
    strength: 1,
  };
  let scene: Container | null = null;

  // 场景同时含「白色」和「彩色」图形：tint 是乘法，
  // 白色图形直接显 tint 色，彩色图形按通道相乘偏色 / 变暗。
  function buildScene(): Container {
    const g = new Graphics();
    g.rect(-120, -70, 96, 96).fill(0xffffff); // 白方块 → tint 后显 tint 色
    g.circle(0, -22, 50).fill(0xff8c42); // 橙圆 → 乘 tint 后偏色
    g.star(95, -30, 5, 42, 20).fill(0x22c55e); // 绿星 → 乘 tint 后偏色
    g.roundRect(-120, 40, 220, 50, 12).fill(0x4f7cff); // 蓝圆角矩形
    g.stroke({ width: 3, color: 0xf8fafc, alpha: 0.6 });

    const text = new Text({
      text: 'TINT',
      style: { ...MONO, fontSize: 24, fill: 0xf8fafc, fontWeight: '700' },
    });
    text.anchor.set(0.5);
    text.y = 110;

    const container = new Container();
    container.addChild(g, text);
    return container;
  }

  // 用 Color 解析任意输入；tint 没有原生强度参数，
  // 在白色（0xffffff，无 tint）与目标色之间按 strength 线性插值模拟强度。
  function resolveTint(tint: string, strength: number): Color {
    const target = new Color(tint);
    if (strength >= 1) {
      return target;
    }
    const t = Math.max(0, Math.min(1, strength));
    const rgb = target.toArray(); // [r, g, b, a]，归一化 0-1
    // 白色通道为 1，按 t 在目标色与白色间插值。
    const mixed = [
      rgb[0] + (1 - rgb[0]) * (1 - t),
      rgb[1] + (1 - rgb[1]) * (1 - t),
      rgb[2] + (1 - rgb[2]) * (1 - t),
      rgb[3],
    ];
    return new Color(mixed);
  }

  function describeColor(color: Color, strength: number): TintColorSnapshot {
    // Color 的多种转换方法：同一颜色输出为 hex / rgba 字符串 / 数字。
    return {
      hex: color.toHex(),
      rgba: color.toRgbaString(),
      number: `0x${color.toNumber().toString(16).padStart(6, '0')}`,
      strength,
    };
  }

  function applyTint(args: TintColorArgs) {
    current = args;
    if (!ready || !scene) {
      return;
    }
    const resolved = resolveTint(args.tint, args.strength);
    // tint 设到承载场景的容器上：作用于它和全部子节点，子节点未单独设 tint 时继承。
    scene.tint = resolved.toNumber();
    emit(describeColor(resolved, args.strength));
  }

  function layout() {
    if (!scene) {
      return;
    }
    scene.x = app.screen.width / 2;
    scene.y = app.screen.height / 2;
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    background: '#1a1a2e',
    antialias: true,
    preference: 'webgl',
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    scene = buildScene();
    app.stage.addChild(scene);
    layout();
    applyTint(current);
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
  visibilityObserver.observe(canvas.parentElement ?? canvas);

  return {
    update(options) {
      applyTint(options);
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
