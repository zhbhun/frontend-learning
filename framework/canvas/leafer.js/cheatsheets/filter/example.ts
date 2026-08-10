/**
 * 演示内容：LeaferJS 的 filter 属性 —— 一个「先注册处理器、再用 filter 属性应用」的
 *           自定义滤镜框架。2.2.9 没有内置滤镜类型，blur / brightness / hue 全部由
 *           Filter.register 自行注册，把 CSS filter 函数桥接到 Canvas 上。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           顶部副作用导入 @leafer-in/filter，为 Filter 注入 register / list / getSpread，
 *           否则 filter 属性不生效。
 *           本课公开输入为 模糊半径 blur（px）、亮度 brightness（%）、色相 hue（°）。
 * 主要操作：ensureFilters() 注册三个自定义滤镜（blur / brightness / hue），各用同一个
 *           「设 CSS filter → resetTransform → copyWorld 自拷贝 → 复位」的模式；
 *           new Leafer({ view: canvas }) 复用传入的 <canvas>，画一层深色背景 + 一个居中、
 *           带四色线性渐变的前景 Rect；
 *           update(options) 把三个滤镜组成一个数组 set 到前景 Rect 的 filter 属性上。
 *           值为「中性」（blur=0 / brightness=100 / hue=0）的滤镜置 visible:false，
 *           引擎会把它从生效集合里剔除 —— 读数里的「启用 N」随之同步。
 * 预期结果：调大 blur → 渐变条带与圆角边缘柔和外溢；调亮度 <100% 变暗、>100% 变亮；
 *           调 hue → 整体色相沿色环旋转；三项都归零时读数显示「启用 0」、图形回到原始。
 *           左下角读数同步显示「模糊 / 亮度 / 色相 / filter 数组」。
 * 阅读主线：registerFilterProcessors 注册三枚滤镜 → createFilterDemo 搭建场景
 *           → applyFilters 组合并应用 → update / dispose。
 *
 * 滤镜执行模式（@leafer-in/filter 约定）：每个处理器的 apply 收到 (filter, ui, worldBounds,
 *   currentCanvas, originCanvas, shape)。在 currentCanvas 上设 CSS filter 字符串、重置变换、
 *   用 copyWorld 把画面自拷贝一遍（'copy' 合成即用滤镜后的像素覆盖原像素），再复位 filter。
 *   getSpread 返回需要向外扩展的渲染像素：模糊要 >0 否则光晕被裁切，颜色类返回 0。
 */
import { Leafer, Rect, Ellipse, Text, Filter } from 'leafer-ui';
import '@leafer-in/filter';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 自定义滤镜的参数形状：IFilter 是开放对象（extends IObject），额外字段由我们自行约定。
interface BlurFilter {
  type: 'blur';
  blur: number;
  visible?: boolean;
}
interface ValueFilter {
  type: 'brightness';
  value: number; // CSS brightness() 的入参，1 = 原样
  visible?: boolean;
}
interface HueFilter {
  type: 'hue';
  angle: number; // CSS hue-rotate() 的度数
  visible?: boolean;
}

export interface FilterDemoOptions {
  blur: number; // px
  brightness: number; // %
  hue: number; // °
}

export interface FilterDemoSnapshot {
  /** 当前模糊半径。 */
  blur: string;
  /** 当前亮度百分比。 */
  brightness: string;
  /** 当前色相角度。 */
  hue: string;
  /** filter 数组：总项数与生效项数。 */
  filters: string;
}

export interface FilterDemoInstance {
  update(options: FilterDemoOptions): void;
  dispose(): void;
}

let filtersReady = false;

/**
 * 注册三枚自定义滤镜。@leafer-in/filter 的 Filter.list 在首次 import 后为 {}，
 * 用 filtersReady 做模块级幂等守护，避免 HMR 或多次创建实例时重复注册。
 * 注册名即 filter.type 要匹配的字符串。
 */
function registerFilterProcessors(): void {
  if (filtersReady) {
    return;
  }

  // 模糊：CSS blur()。getSpread 必须返回 blur，否则外溢的光晕会被包围盒裁掉。
  Filter.register('blur', {
    apply(filter, _ui, worldBounds, currentCanvas) {
      const blur = (filter as BlurFilter).blur;
      currentCanvas.filter = `blur(${blur}px)`;
      currentCanvas.resetTransform();
      currentCanvas.copyWorld(currentCanvas, worldBounds, worldBounds, 'copy');
      currentCanvas.filter = 'none';
    },
    getSpread(filter) {
      return (filter as BlurFilter).blur;
    },
  });

  // 亮度：CSS brightness()。不改变包围盒，getSpread 返回 0。
  Filter.register('brightness', {
    apply(filter, _ui, worldBounds, currentCanvas) {
      const value = (filter as ValueFilter).value;
      currentCanvas.filter = `brightness(${value})`;
      currentCanvas.resetTransform();
      currentCanvas.copyWorld(currentCanvas, worldBounds, worldBounds, 'copy');
      currentCanvas.filter = 'none';
    },
    getSpread() {
      return 0;
    },
  });

  // 色相：CSS hue-rotate()。同样不扩展包围盒。
  Filter.register('hue', {
    apply(filter, _ui, worldBounds, currentCanvas) {
      const angle = (filter as HueFilter).angle;
      currentCanvas.filter = `hue-rotate(${angle}deg)`;
      currentCanvas.resetTransform();
      currentCanvas.copyWorld(currentCanvas, worldBounds, worldBounds, 'copy');
      currentCanvas.filter = 'none';
    },
    getSpread() {
      return 0;
    },
  });

  filtersReady = true;
}

export function createFilterDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FilterDemoSnapshot) => void,
): FilterDemoInstance {
  registerFilterProcessors();

  let current: FilterDemoOptions = { blur: 4, brightness: 100, hue: 0 };

  // view 直接传 HTMLCanvasElement 时，Leafer 复用该 <canvas>；尺寸由舞台客户端尺寸决定。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#1e2433',
  });

  let backdrop: Ellipse | null = null;
  let main: Rect | null = null;
  let caption: Text | null = null;

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  // 每次布局：先画一层柔和的背景椭圆做深度参照，再画居中的四色渐变前景（滤镜挂在它身上），
  // 最后画一行说明文字（不挂滤镜，作为对照）。around:'center' 时 x/y 直接给画布中心即居中。
  function layout() {
    if (backdrop) {
      leafer.remove(backdrop);
      backdrop.destroy();
      backdrop = null;
    }
    if (main) {
      leafer.remove(main);
      main.destroy();
      main = null;
    }
    if (caption) {
      leafer.remove(caption);
      caption.destroy();
      caption = null;
    }

    const center = {
      x: leafer.canvas.width / 2,
      y: leafer.canvas.height / 2,
    };

    backdrop = new Ellipse({
      width: 360,
      height: 360,
      fill: '#2a3247',
      around: 'center',
      x: center.x,
      y: center.y,
    });
    leafer.add(backdrop);

    main = new Rect({
      width: 300,
      height: 176,
      cornerRadius: 28,
      fill: {
        type: 'linear' as const,
        from: 'top-left' as const,
        to: 'bottom-right' as const,
        // 高对比的四色渐变：模糊时条带软化、调色相时整体沿色环平移，最便于肉眼观察。
        stops: ['#ff4d4d', '#ffb300', '#27c955', '#2b8cff'],
      },
      around: 'center',
      x: center.x,
      y: center.y,
    });
    leafer.add(main);

    caption = new Text({
      text: 'filter: blur + brightness + hue-rotate',
      fontSize: 14,
      fill: '#8a93a6',
      textAlign: 'center',
      around: 'center',
      x: center.x,
      y: center.y + 132,
    });
    leafer.add(caption);
  }

  // 把三个滤镜组成数组 set 到前景。中性值的滤镜置 visible:false，
  // 引擎在生效前会先把 visible===false 的项剔除（见 draw 模块 setFilter 逻辑）。
  function applyFilters(options: FilterDemoOptions) {
    if (!main) {
      return;
    }

    const filters: Array<BlurFilter | ValueFilter | HueFilter> = [
      {
        type: 'blur',
        blur: options.blur,
        visible: options.blur > 0,
      },
      {
        type: 'brightness',
        value: options.brightness / 100,
        visible: options.brightness !== 100,
      },
      {
        type: 'hue',
        angle: options.hue,
        visible: options.hue !== 0,
      },
    ];

    main.set({ filter: filters });

    const active = filters.filter((f) => f.visible !== false).length;
    emit({
      blur: `${options.blur}px`,
      brightness: `${options.brightness}%`,
      hue: `${options.hue}°`,
      filters: `${filters.length} 项（启用 ${active}）`,
    });
  }

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布尺寸并重建布局。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    layout();
    applyFilters(current);
  });

  syncSize();
  layout();
  applyFilters(current);

  return {
    update(options) {
      current = options;
      applyFilters(options);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
