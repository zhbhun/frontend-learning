/**
 * 范例介绍：演示滤镜链的处理顺序——数组里前一个滤镜的输出是后一个滤镜的输入。
 *
 * 演示内容：彩色场景上叠加 BlurFilter 与 NoiseFilter，可切换顺序、开关第二个滤镜。
 * 输入：链顺序（blur→noise / noise→blur）、是否启用第二个滤镜。
 *
 * 预期结果（顺序差异在「噪声颗粒是否被模糊」上最直观）：
 *   - blur→noise：先平滑再叠噪声 → 噪声颗粒锐利，底图模糊。
 *   - noise→blur：先叠噪声再平滑 → 噪声也被模糊，整体朦胧。
 *   - 关闭第二个：只剩单个滤镜，作为对照。
 *
 * 阅读主线：先看 blurFilter / noiseFilter 两个实例在 init 里创建并复用，
 * 再看 applyChain 如何按 order 组装数组——scene.filters = [a, b] 的顺序就是处理顺序。
 */
import {
  Application,
  Container,
  Graphics,
  Text,
  BlurFilter,
  NoiseFilter,
  type Filter,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ChainDemoArgs {
  order: string;
  enabledSecond: boolean;
}

export interface ChainDemoSnapshot {
  chain: string;
}

export interface ChainDemoInstance {
  update(args: ChainDemoArgs): void;
  dispose(): void;
}

// 固定参数：让读者聚焦顺序差异，而非参数调节。
const BLUR_STRENGTH = 6;
const NOISE_AMOUNT = 0.35;

export function createChainDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChainDemoSnapshot) => void,
): ChainDemoInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: ChainDemoArgs = { order: 'blurThenNoise', enabledSecond: true };
  let scene: Container | null = null;
  let blurFilter: BlurFilter;
  let noiseFilter: NoiseFilter;

  function buildScene(): Container {
    const g = new Graphics();
    g.circle(-60, -12, 44).fill(0x4f7cff);
    g.rect(8, -52, 64, 46).fill(0xff8c42);
    g.star(28, 42, 5, 34, 16).fill(0x22c55e);
    g.circle(-42, 46, 20).fill(0xff5a7a);
    g.stroke({ width: 3, color: 0xf8fafc });

    const text = new Text({
      text: 'CHAIN',
      style: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 20,
        fill: 0xf8fafc,
        fontWeight: '700',
      },
    });
    text.anchor.set(0.5);
    text.y = -82;

    const container = new Container();
    container.addChild(g, text);
    return container;
  }

  function applyChain(args: ChainDemoArgs) {
    current = args;
    if (!ready || !scene) {
      return;
    }
    // 数组顺序即处理顺序：[a, b] 表示先用 a 处理，再用 b 处理 a 的输出。
    const first: Filter = args.order === 'blurThenNoise' ? blurFilter : noiseFilter;
    const second: Filter = args.order === 'blurThenNoise' ? noiseFilter : blurFilter;
    scene.filters = args.enabledSecond ? [first, second] : [first];

    const firstName = first instanceof BlurFilter ? 'blur' : 'noise';
    const secondName = second instanceof BlurFilter ? 'blur' : 'noise';
    emit({ chain: args.enabledSecond ? `${firstName} → ${secondName}` : firstName });
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
    // 两个滤镜实例只创建一次，后续切换顺序只重组数组，不重建实例。
    blurFilter = new BlurFilter({ strength: BLUR_STRENGTH, quality: 4 });
    blurFilter.padding = 8; // 给模糊留边距，避免边缘裁切干扰对比
    noiseFilter = new NoiseFilter({ noise: NOISE_AMOUNT });

    scene = buildScene();
    app.stage.addChild(scene);
    layout();
    applyChain(current);
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
      applyChain(options);
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
