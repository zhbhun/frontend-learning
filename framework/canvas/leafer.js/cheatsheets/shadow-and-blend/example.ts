/**
 * 演示内容：LeaferJS 的视觉效果四件套——外阴影 shadow、内阴影 innerShadow、
 *           混合模式 blendMode、透明度 opacity，如何按固定顺序叠加到同一个图形上。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入为 阴影偏移 shadowX / shadowY、阴影模糊 shadowBlur、
 *           内阴影 innerShadow（无 / 柔和 / 强烈）、混合模式 blendMode、透明度 opacity。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas>；
 *           先挂一层「明亮背景」（黄 + 青两个椭圆）让混合与透明可见，再挂一个居中的圆角矩形（前景）；
 *           update(options) 把 shadow / innerShadow / blendMode / opacity 直接 set 到前景矩形上。
 *           四个效果共享同一个 UI 节点，印证它们都是 UI 基类的样式属性。
 * 预期结果：调整 shadowX/Y/blur → 外阴影偏移与柔和度变化；切换 innerShadow → 图形内侧出现暗边；
 *           切换 blendMode → 前景矩形与明亮背景相混（multiply 变暗、screen 变亮、overlay 加深对比）；
 *           调整 opacity → 整个前景（含阴影）变透明、背景透出。
 *           左下角读数同步显示「外阴影 / 内阴影 / 混合模式 / 透明度」。
 * 阅读主线：createVisualEffect → 背景+前景布局 layout → applyOptions 把四类属性 set 到前景 → update/dispose。
 *
 * 叠加顺序（从下到上）：背景内容 → 外阴影（围绕图形外侧）→ 图形本体 fill/stroke → 内阴影（图形内侧）
 *                     → 整体按 blendMode 与下方内容合成、再乘以 opacity。
 */
import { Leafer, Rect, Ellipse, Group } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type BlendModeOption =
  | 'pass-through'
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export type InnerShadowPreset = 'none' | 'soft' | 'strong';

export interface VisualEffectOptions {
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  innerShadow: InnerShadowPreset;
  blendMode: BlendModeOption;
  opacity: number;
}

export interface VisualEffectSnapshot {
  /** 外阴影参数（偏移与模糊）。 */
  shadow: string;
  /** 内阴影预设的中文标签。 */
  innerShadow: string;
  /** 当前混合模式。 */
  blendMode: string;
  /** 当前透明度（0~1）。 */
  opacity: string;
}

export interface VisualEffectInstance {
  update(options: VisualEffectOptions): void;
  dispose(): void;
}

// 外阴影统一用一个半透明暗色，让偏移与模糊成为唯一变量，读数与视觉一一对应。
const SHADOW_COLOR = 'rgba(24,12,40,0.45)';

// 内阴影预设：把 blur / color 组合成可读档位，避免再多两个控件分散注意力。
// 「无」用 undefined 表示，与 innerShadow 属性的可选类型一致（该属性不接受 null）。
const INNER_PRESETS: Record<
  InnerShadowPreset,
  { x: number; y: number; blur: number; color: string } | undefined
> = {
  none: undefined,
  soft: { x: 0, y: 10, blur: 18, color: 'rgba(80,0,60,0.45)' },
  strong: { x: 0, y: 16, blur: 26, color: 'rgba(50,0,40,0.7)' },
};

const INNER_LABELS: Record<InnerShadowPreset, string> = {
  none: '无',
  soft: '柔和',
  strong: '强烈',
};

export function createVisualEffect(
  canvas: HTMLCanvasElement,
  emit: (snapshot: VisualEffectSnapshot) => void,
): VisualEffectInstance {
  let current: VisualEffectOptions = {
    shadowX: 12,
    shadowY: 10,
    shadowBlur: 22,
    innerShadow: 'soft',
    blendMode: 'pass-through',
    opacity: 1,
  };

  // view 直接传 HTMLCanvasElement 时，Leafer 复用该 <canvas>；尺寸由舞台客户端尺寸决定。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f3f0fb',
  });

  let background: Group | null = null;
  let main: Rect | null = null;

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  // 每次布局：先画「明亮背景」（让混合 / 透明有可对比的下方内容），再画居中前景。
  // 背景与前景都用 around: 'center'，x/y 直接给画布中心即可居中（around 的完整语义见「变换」课）。
  function layout() {
    if (background) {
      leafer.remove(background);
      background.destroy();
      background = null;
    }
    if (main) {
      leafer.remove(main);
      main.destroy();
      main = null;
    }

    const center = {
      x: leafer.canvas.width / 2,
      y: leafer.canvas.height / 2,
    };

    background = new Group();
    background.add(
      new Ellipse({
        width: 170,
        height: 170,
        fill: '#ffe11a',
        around: 'center',
        x: center.x - 48,
        y: center.y - 36,
      }),
    );
    background.add(
      new Ellipse({
        width: 170,
        height: 170,
        fill: '#1ad1ff',
        around: 'center',
        x: center.x + 48,
        y: center.y + 36,
      }),
    );
    leafer.add(background);

    main = new Rect({
      width: 168,
      height: 168,
      cornerRadius: 40,
      fill: '#e0218a',
      around: 'center',
      x: center.x,
      y: center.y,
    });
    leafer.add(main);
  }

  // 四个效果都是 UI 基类的样式属性，直接 set 到同一个前景节点即可实时生效。
  function applyOptions(options: VisualEffectOptions) {
    if (!main) {
      return;
    }
    const inner = INNER_PRESETS[options.innerShadow];
    main.set({
      shadow: {
        x: options.shadowX,
        y: options.shadowY,
        blur: options.shadowBlur,
        color: SHADOW_COLOR,
      },
      innerShadow: inner,
      blendMode: options.blendMode,
      opacity: options.opacity,
    });

    emit({
      shadow: `x ${options.shadowX}, y ${options.shadowY}, blur ${options.shadowBlur}`,
      innerShadow: INNER_LABELS[options.innerShadow],
      blendMode: options.blendMode,
      opacity: options.opacity.toFixed(2),
    });
  }

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布尺寸并重建布局。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    layout();
    applyOptions(current);
  });

  syncSize();
  layout();
  applyOptions(current);

  return {
    update(options) {
      current = options;
      applyOptions(options);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
