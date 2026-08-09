/**
 * 范例介绍：演示 PixiJS 混合模式（blendMode）如何决定对象与背景的合成结果。
 *
 * 演示内容：一个可调的背景矩形上，三个互相重叠的半透明彩色圆盘（红 / 绿 / 蓝）。
 *           整组圆盘挂在一个 Container 上，改变它的 blendMode 即改变它们与背景、
 *           以及彼此之间的像素合成方式。
 * 输入：blendMode（normal / add / multiply / screen / overlay / difference / erase）、
 *       背景色。
 * 主要操作：update 时按 blendMode 设置 disks.blendMode，按背景色重画背景。
 *
 * 预期结果：
 *   - normal：标准 alpha 合成，重叠区颜色正常叠加。
 *   - add：重叠区明显变亮趋白，像光晕 / 火焰。
 *   - multiply：整体变暗，重叠区更深，常用于阴影 / 染色。
 *   - screen：重叠区变亮但比 add 柔和（滤色）。
 *   - overlay：对比增强，明处更亮暗处更暗（高级模式）。
 *   - difference：重叠区出现补色，像色彩反相（高级模式）。
 *   - erase：擦除背景像素，露出画布清除色。
 *
 * 阅读主线：先看 buildScene 构造背景 + 彩色圆盘，
 * 再看 applyBlend 的热更新（blendMode 直接设到 disks 容器上），
 * 最后看 init 的 useBackBuffer（高级混合模式在 WebGL 上需要它）与 dispose 的释放、离屏暂停。
 */
import 'pixi.js/advanced-blend-modes';
import { Application, Container, Graphics, Color } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface BlendModesArgs {
  blendMode: string;
  background: string;
}

export interface BlendModesSnapshot {
  blendMode: string;
  isAdvanced: boolean;
  background: string;
}

export interface BlendModesInstance {
  update(args: BlendModesArgs): void;
  dispose(): void;
}

// 高级（filter-based）混合模式：需要 import 'pixi.js/advanced-blend-modes'，
// 且在 WebGL 上需要 useBackBuffer: true，因为这些模式要采样背景像素。
const ADVANCED_MODES = new Set([
  'overlay',
  'soft-light',
  'hard-light',
  'linear-light',
  'vivid-light',
  'pin-light',
  'hard-mix',
  'difference',
  'exclusion',
  'negation',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'linear-burn',
  'linear-dodge',
  'subtract',
  'divide',
  'saturation',
  'color',
  'luminosity',
]);

const MODE_LABELS: Record<string, string> = {
  normal: 'normal（标准 alpha 合成）',
  add: 'add（加法 / 变亮）',
  multiply: 'multiply（乘法 / 变暗）',
  screen: 'screen（滤色 / 提亮）',
  overlay: 'overlay（叠加 / 增对比，高级）',
  difference: 'difference（差值 / 反相，高级）',
  erase: 'erase（擦除背景）',
};

export function createBlendModesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BlendModesSnapshot) => void,
): BlendModesInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: BlendModesArgs = {
    blendMode: 'normal',
    background: '#1a1a2e',
  };
  let disks: Container | null = null;
  let background: Graphics | null = null;

  // 三个互相重叠的半透明彩色圆盘。放在独立 Container 上，
  // 这样 blendMode 设到 disks 上即可整体控制它们与背景的合成。
  function buildDisks(): Container {
    const container = new Container();
    const g = new Graphics();
    g.circle(0, 0, 78).fill({ color: 0xff3b5c, alpha: 0.85 }); // 红圆
    g.circle(90, 0, 78).fill({ color: 0x36e07a, alpha: 0.85 }); // 绿圆
    g.circle(45, -78, 78).fill({ color: 0x3b8bff, alpha: 0.85 }); // 蓝圆
    container.addChild(g);
    return container;
  }

  function buildBackground(color: string): Graphics {
    const g = new Graphics();
    g.rect(0, 0, app.screen.width, app.screen.height).fill(color);
    return g;
  }

  function applyBlend(args: BlendModesArgs) {
    current = args;
    if (!ready || !disks || !background) {
      return;
    }
    // blendMode 直接设到承载圆盘的容器上：作用于它（及子节点）与背景的合成。
    disks.blendMode = args.blendMode as never;

    // 背景色变化时重建背景（在 disks 之下）。
    const newBg = buildBackground(args.background);
    const idx = app.stage.getChildIndex(background);
    app.stage.removeChild(background);
    background.destroy();
    app.stage.addChildAt(newBg, idx);
    background = newBg;

    emit({
      blendMode: MODE_LABELS[args.blendMode] ?? args.blendMode,
      isAdvanced: ADVANCED_MODES.has(args.blendMode),
      background: new Color(args.background).toHex(),
    });
  }

  function layout() {
    if (!disks) {
      return;
    }
    disks.x = app.screen.width / 2;
    disks.y = app.screen.height / 2 + 20;
    if (background) {
      background.width = app.screen.width;
      background.height = app.screen.height;
    }
  }

  const initial = readCanvasSize(canvas);
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    preference: 'webgl',
    // 高级混合模式基于滤镜，要采样已绘制的背景像素；
    // WebGL 默认不能读回主画布，必须开 useBackBuffer（默认 false）。
    useBackBuffer: true,
    antialias: true,
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    background = buildBackground(current.background);
    app.stage.addChild(background);
    disks = buildDisks();
    app.stage.addChild(disks);
    layout();
    applyBlend(current);
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

  // 离屏暂停渲染循环以省 GPU。
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
      applyBlend(options);
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
