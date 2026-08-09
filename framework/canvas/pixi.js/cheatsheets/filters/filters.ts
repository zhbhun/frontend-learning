/**
 * 范例介绍：演示 PixiJS 滤镜的应用方式与各内置滤镜的参数效果，以及 padding 如何防止裁切。
 *
 * 演示内容：一个彩色场景（几何图形 + 文字）应用单个滤镜。
 * 输入：滤镜类型（blur / saturate / sepia / negative / noise / displacement / alpha）、
 *       各类型的主参数、padding。
 * 主要操作：update 时按类型构建 Filter 实例，设置 padding，赋给 scene.filters = [filter]。
 *
 * 预期结果：
 *   - 切「滤镜类型」→ 场景呈现对应滤镜的视觉效果。
 *   - 调主参数（strength / amount / noise / scale / alpha）→ 效果强度同步变化。
 *   - 调「padding」→ 对 blur、displacement 等会扩展到对象边界外的效果，
 *     padding 越大越能保留溢出部分（默认 0 会被裁切）。
 *
 * 阅读主线：先看 buildScene 构造被处理的彩色场景，
 * 再看 buildFilter 按类型创建滤镜实例并映射参数，
 * 最后看 applyFilter 的热更新与 dispose 的资源释放、离屏暂停。
 */
import {
  Application,
  Container,
  Graphics,
  Text,
  BlurFilter,
  ColorMatrixFilter,
  NoiseFilter,
  DisplacementFilter,
  AlphaFilter,
  Sprite,
  type Filter,
} from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface FilterDemoArgs {
  filterType: string;
  strength: number;
  amount: number;
  noise: number;
  scale: number;
  alpha: number;
  padding: number;
}

export interface FilterDemoSnapshot {
  filterType: string;
  primaryParam: string;
  padding: number;
}

export interface FilterDemoInstance {
  update(args: FilterDemoArgs): void;
  dispose(): void;
}

const FILTER_LABELS: Record<string, string> = {
  blur: 'BlurFilter 模糊',
  saturate: 'ColorMatrixFilter 饱和度',
  sepia: 'ColorMatrixFilter 棕褐',
  negative: 'ColorMatrixFilter 反色',
  noise: 'NoiseFilter 噪声',
  displacement: 'DisplacementFilter 位移',
  alpha: 'AlphaFilter 透明',
};

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
} as const;

export function createFilterDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FilterDemoSnapshot) => void,
): FilterDemoInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: FilterDemoArgs = {
    filterType: 'blur',
    strength: 8,
    amount: 0,
    noise: 0.5,
    scale: 20,
    alpha: 1,
    padding: 0,
  };
  let scene: Container | null = null;
  let displacementSprite: Sprite | null = null;

  // 构造被滤镜处理的彩色场景：几何图形 + 文字，画在以 (0,0) 为中心的局部坐标。
  // 描边让模糊/位移的边界更易辨认；图形靠近边界，使 padding=0 时的裁切可见。
  function buildScene(): Container {
    const g = new Graphics();
    g.circle(-70, -20, 48).fill(0x4f7cff); // 蓝圆
    g.rect(20, -64, 72, 52).fill(0xff8c42); // 橙矩形
    g.star(40, 44, 5, 38, 18).fill(0x22c55e); // 绿星
    g.circle(-50, 52, 22).fill(0xff5a7a); // 粉圆
    g.stroke({ width: 3, color: 0xf8fafc }); // 给前面所有几何描边

    const text = new Text({
      text: 'FILTERS',
      style: { ...MONO, fontSize: 22, fill: 0xf8fafc, fontWeight: '700' },
    });
    text.anchor.set(0.5);
    text.y = -94;

    const container = new Container();
    container.addChild(g, text);
    return container;
  }

  // 生成 DisplacementFilter 的位移图：红通道→水平位移，绿通道→垂直位移。
  // 用 renderer.generateTexture 把 Graphics 转成静态纹理；Sprite 只取其纹理，不加入场景。
  function buildDisplacementMap(): Sprite {
    const map = new Graphics();
    map.circle(60, 60, 56).fill(0xff0000); // 纯红
    map.circle(-60, -60, 56).fill(0x00ff00); // 纯绿
    map.circle(60, -60, 56).fill(0xffff00); // 红绿叠加
    map.circle(-60, 60, 56).fill(0x808000); // 半红半绿
    const texture = app.renderer.generateTexture(map);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    return sprite;
  }

  // 按类型构建滤镜实例并映射主参数。每次 update 重建实例，padding 直接设到实例上。
  function buildFilter(args: FilterDemoArgs): Filter {
    switch (args.filterType) {
      case 'saturate': {
        const f = new ColorMatrixFilter();
        f.saturate(args.amount); // amount: -1 灰度 ~ 1 高饱和
        f.padding = args.padding;
        return f;
      }
      case 'sepia': {
        const f = new ColorMatrixFilter();
        f.sepia();
        f.padding = args.padding;
        return f;
      }
      case 'negative': {
        const f = new ColorMatrixFilter();
        f.negative();
        f.padding = args.padding;
        return f;
      }
      case 'noise': {
        const f = new NoiseFilter({ noise: args.noise });
        f.padding = args.padding;
        return f;
      }
      case 'displacement': {
        const f = new DisplacementFilter({
          sprite: displacementSprite!,
          scale: args.scale,
        });
        f.padding = args.padding;
        return f;
      }
      case 'alpha': {
        const f = new AlphaFilter({ alpha: args.alpha });
        f.padding = args.padding;
        return f;
      }
      case 'blur':
      default: {
        const f = new BlurFilter({ strength: args.strength, quality: 4 });
        f.padding = args.padding;
        return f;
      }
    }
  }

  function describePrimary(args: FilterDemoArgs): string {
    switch (args.filterType) {
      case 'saturate':
        return `saturate(${args.amount})`;
      case 'sepia':
        return 'sepia()';
      case 'negative':
        return 'negative()';
      case 'noise':
        return `noise=${args.noise}`;
      case 'displacement':
        return `scale=${args.scale}`;
      case 'alpha':
        return `alpha=${args.alpha}`;
      case 'blur':
      default:
        return `strength=${args.strength}`;
    }
  }

  function applyFilter(args: FilterDemoArgs) {
    current = args;
    if (!ready || !scene) {
      return;
    }
    scene.filters = buildFilter(args); // 滤镜挂在 scene 上，作用于它和全部子节点
    emit({
      filterType: FILTER_LABELS[args.filterType] ?? args.filterType,
      primaryParam: describePrimary(args),
      padding: args.padding,
    });
  }

  function layout() {
    if (!scene) {
      return;
    }
    scene.x = app.screen.width / 2;
    scene.y = app.screen.height / 2;
    if (displacementSprite) {
      // 位移图锚点居中并对齐场景中心，纹理大致覆盖场景区域。
      displacementSprite.x = app.screen.width / 2;
      displacementSprite.y = app.screen.height / 2;
    }
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
    displacementSprite = buildDisplacementMap(); // 需在 renderer 就绪后生成纹理
    scene = buildScene();
    app.stage.addChild(scene);
    layout();
    applyFilter(current);
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
      applyFilter(options);
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
