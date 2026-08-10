/**
 * 演示内容：LeaferJS Image 元素的加载（url）、自然尺寸、ready 状态，
 *           以及图片填充模式 cover / fit / stretch 的差异。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           公开输入：填充模式 fillMode、显示宽 boxWidth、显示高 boxHeight。
 * 主要操作：预加载一张内联 SVG 占位图（240×160，3:2）拿到自然尺寸与 ready 状态；
 *           按 fillMode 构造节点——auto / stretch 用 Image（url 内部即 stretch 填充），
 *           cover / fit 改用 Rect + image 填充（Image 元素不支持自定义 fill 模式，需用 Rect 代替）；
 *           around:'center' 把节点居中到画布中心（around 的完整语义见「变换」课）。
 * 预期结果：切换 fillMode → 节点类型与填充效果同步变化（cover 裁剪铺满、fit 等比留白、stretch 拉伸）；
 *           调整 boxWidth / boxHeight → 显示框尺寸变化；左下读数显示「加载状态 / 原始尺寸 / 节点 / 显示 / 模式」。
 *           其中「节点」读数揭示关键映射：cover/fit 只能由 Rect + fill 承担，auto/stretch 才用 Image。
 * 阅读主线：createImageDemo → Leafer 配置(view) → 预加载 LeaferImage → buildNode 按 fillMode 分支 → 居中挂载 → update 同步 → dispose 销毁。
 */
import {
  Leafer,
  Image,
  Rect,
  LeaferImage,
  type IUI,
} from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 内联 SVG 占位图：240×160（3:2），四角不同色块 + 虚线边框 + 中心尺寸标注，
// 便于直观区分 cover（裁剪）/ fit（留白）/ stretch（拉伸）的差异。
// 运行时编码为 data URL，无外网依赖；引擎通过 ImageManager 缓存，多处复用同一张位图。
const SVG_SOURCE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#fb923c"/><stop offset="0.5" stop-color="#f43f5e"/><stop offset="1" stop-color="#a855f7"/>' +
  '</linearGradient></defs>' +
  '<rect width="240" height="160" fill="url(#g)"/>' +
  '<rect x="2" y="2" width="236" height="156" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="8 5"/>' +
  '<circle cx="34" cy="34" r="18" fill="#ffffff" opacity="0.9"/>' +
  '<circle cx="206" cy="34" r="18" fill="#fde68a" opacity="0.9"/>' +
  '<circle cx="34" cy="126" r="18" fill="#86efac" opacity="0.9"/>' +
  '<circle cx="206" cy="126" r="18" fill="#93c5fd" opacity="0.9"/>' +
  '<text x="120" y="92" font-family="ui-sans-serif, system-ui, sans-serif" font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">240×160</text>' +
  '</svg>';
const IMAGE_URL = 'data:image/svg+xml,' + encodeURIComponent(SVG_SOURCE);

export type ImageFillMode = 'auto' | 'stretch' | 'cover' | 'fit';

export interface ImageDemoOptions {
  fillMode: ImageFillMode;
  boxWidth: number;
  boxHeight: number;
}

export interface ImageDemoSnapshot {
  /** 图片是否加载完成（中文）。 */
  ready: string;
  /** 图片的自然（原始）像素尺寸。 */
  natural: string;
  /** 当前实际实例化的节点类型，揭示 cover/fit 必须用 Rect + fill 的映射。 */
  node: string;
  /** 显示框尺寸；auto 模式给出自然尺寸说明。 */
  box: string;
  /** 当前填充模式。 */
  mode: string;
}

export interface ImageDemoInstance {
  update(options: ImageDemoOptions): void;
  dispose(): void;
}

export function createImageDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ImageDemoSnapshot) => void,
): ImageDemoInstance {
  let current: ImageDemoOptions = {
    fillMode: 'cover',
    boxWidth: 220,
    boxHeight: 220,
  };

  // view 直接传入 HTMLCanvasElement 时，Leafer 复用该 <canvas> 作为渲染目标。
  // 不给 width / height，让 Leafer 按画布元素的客户端尺寸自适应；舞台尺寸变化时用 resize() 同步。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  // 预加载图片：拿到自然尺寸与 ready 状态供 readout，独立于当前渲染的节点类型。
  // data URL 加载近乎瞬时，回调触发后重渲染一次以刷新读数。
  let naturalWidth = 0;
  let naturalHeight = 0;
  let imageReady = false;
  const probe = new LeaferImage({ url: IMAGE_URL });
  probe.load((img) => {
    naturalWidth = img.width;
    naturalHeight = img.height;
    imageReady = true;
    render(current);
  });

  let node: IUI | null = null;

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  // 关键映射：Image 的 url 内部就是一条 mode:'stretch' 的 image 填充，
  // 因此只有 auto / stretch 能用 Image；cover / fit 必须改用 Rect + image 填充。
  function buildNode(options: ImageDemoOptions): IUI {
    const { fillMode, boxWidth, boxHeight } = options;
    if (fillMode === 'cover' || fillMode === 'fit') {
      // Rect + image 填充：mode 控制 cover（裁剪铺满）/ fit（等比留白）。
      return new Rect({
        width: boxWidth,
        height: boxHeight,
        fill: { type: 'image', url: IMAGE_URL, mode: fillMode },
        cornerRadius: 6,
      });
    }
    if (fillMode === 'stretch') {
      // Image + width/height：url 内部按 stretch 渲染，图片被拉伸填满给定框（比例会变形）。
      return new Image({
        url: IMAGE_URL,
        width: boxWidth,
        height: boxHeight,
        cornerRadius: 6,
      });
    }
    // auto：Image 不设 width/height，元素按图片自然尺寸（240×160）显示。
    return new Image({ url: IMAGE_URL, cornerRadius: 6 });
  }

  function describeBox(options: ImageDemoOptions): string {
    if (options.fillMode === 'auto' && naturalWidth) {
      return `${naturalWidth} × ${naturalHeight}（自然）`;
    }
    return `${options.boxWidth} × ${options.boxHeight}`;
  }

  function render(options: ImageDemoOptions) {
    if (node) {
      leafer.remove(node);
      node.destroy();
      node = null;
    }

    node = buildNode(options);

    // around: 'center' 把节点的定位原点移到自身包围盒中心，
    // 于是 x/y 直接给画布中心即可居中；该属性的完整语义见「变换」课。
    const center = {
      x: leafer.canvas.width / 2,
      y: leafer.canvas.height / 2,
    };
    node.set({ around: 'center', x: center.x, y: center.y });
    leafer.add(node);

    emit({
      ready: imageReady ? '已加载' : '加载中',
      natural: naturalWidth ? `${naturalWidth} × ${naturalHeight}` : '—',
      node:
        options.fillMode === 'cover' || options.fillMode === 'fit'
          ? 'Rect + fill'
          : 'Image',
      box: describeBox(options),
      mode: options.fillMode,
    });
  }

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布尺寸并重新居中渲染。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    render(current);
  });

  syncSize();
  render(current);

  return {
    update(options) {
      current = options;
      render(options);
    },
    dispose() {
      resizeObserver.disconnect();
      probe.destroy();
      leafer.destroy();
    },
  };
}
