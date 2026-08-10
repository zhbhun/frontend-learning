/**
 * 范例介绍：演示 Konva 的三种非纯色填充（线性渐变、径向渐变、图案）以及决定
 *   它们谁生效的总开关 fillPriority。
 * 核心观察——同一个形状同时挂上「纯色 + 线性渐变 + 径向渐变 + 图案」四套填充数据，
 *   切换 fillPriority 就能在四种外观间瞬时切换。这揭示 fillPriority 的两阶段选择逻辑：
 *   1) 若 fillPriority 指向的填充数据存在，直接用它；2) 否则按 color > pattern >
 *   linear-gradient > radial-gradient 的顺序取第一个可用的。默认 fillPriority 为 'color'，
 *   所以同时设了 fill 颜色与渐变属性却不显式声明 fillPriority 时，纯色会赢、渐变被忽略。
 *
 * 输入：fillPriority（color / linear-gradient / radial-gradient / pattern）。
 * 操作：update(options) 应用 fillPriority 后用 layer.batchDraw() 重绘；尺寸变化时同步 stage 宽高。
 * 预期：四种 fillPriority 对应四种外观，读数「生效填充」同步反映当前模式。
 *
 * Konva 与 canvasStory 适配：canvasStory 提供 div.cs-stage > canvas；这里隐藏占位 canvas，
 * 把它的父容器交给 Konva.Stage，由 Konva 自带内容 canvas 渲染。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface GradientsOptions {
  /** 填充总开关：决定四套填充数据里哪一套生效。 */
  fillPriority: 'color' | 'linear-gradient' | 'radial-gradient' | 'pattern';
}

export interface GradientsSnapshot {
  /** 当前 fillPriority。 */
  fillPriority: string;
  /** 实际生效的填充（中文标签）。 */
  activeFill: string;
}

export interface GradientsInstance {
  update(options: GradientsOptions): void;
  dispose(): void;
}

// 生成一个可重复的图案源：20×16 离屏 canvas 上画对角条纹。
// createPattern 接受 canvas 作为源（HTMLCanvasElement 属于 CanvasImageSource），
// 用离屏 canvas 同步生成可省去异步加载图片的 onload 处理。
function createPatternSource(): HTMLCanvasElement {
  const width = 20;
  const height = 16;
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const ctx = source.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, height + 2);
    ctx.lineTo(width + 2, -2);
    ctx.stroke();
  }
  return source;
}

// 把 fillPriority 取值映射为中文「生效填充」标签。
const ACTIVE_LABEL: Record<GradientsOptions['fillPriority'], string> = {
  color: '纯色 fill',
  'linear-gradient': '线性渐变',
  'radial-gradient': '径向渐变',
  pattern: '图案',
};

export function createGradients(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GradientsSnapshot) => void,
): GradientsInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const root = canvas.parentElement as HTMLDivElement | null;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  const patternSource = createPatternSource();

  // 中心六边形：同时携带「纯色 + 线性渐变 + 径向渐变 + 图案」四套填充数据。
  // 渐变坐标在「形状本地坐标系」里（相对形状的 x/y 原点，六边形原点是中心），
  // 因此本地端点用相对值，半径与位置在 draw() 中按尺寸重算。
  const shape = new Konva.RegularPolygon({
    sides: 6,
    radius: 80,
    stroke: '#0f172a',
    strokeWidth: 2,
    // 纯色填充（fillPriority='color' 时生效）
    fill: '#475569',
    // 线性渐变（fillPriority='linear-gradient' 时生效）：左上 → 右下
    fillLinearGradientStartPoint: { x: -80, y: -80 },
    fillLinearGradientEndPoint: { x: 80, y: 80 },
    fillLinearGradientColorStops: [0, '#2563eb', 0.5, '#22d3ee', 1, '#a5f3fc'],
    // 径向渐变（fillPriority='radial-gradient' 时生效）：中心向外扩散
    fillRadialGradientStartPoint: { x: 0, y: 0 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndPoint: { x: 0, y: 0 },
    fillRadialGradientEndRadius: 80,
    fillRadialGradientColorStops: [0, '#fde047', 0.5, '#f97316', 1, '#dc2626'],
  });
  // 图案填充：fillPatternImage 接受 HTMLImageElement，离屏 canvas 同样可用。
  // 用 setAttrs 在构造后赋值，规避 fillPatternImage 的严格元素类型。
  // fillPatternImage 运行时接受 canvas，但 TS 声明为 HTMLImageElement；借 NodeConfig 索引签名赋值。
  (shape as Konva.Node).setAttrs({
    fillPatternImage: patternSource,
    fillPatternRepeat: 'repeat',
  });
  layer.add(shape);

  let current: GradientsOptions = { fillPriority: 'color' };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 形状居中，半径按短边缩放，保证可见且不溢出。
    const radius = Math.round(Math.min(width, height) * 0.3);
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    shape.position({ x: cx, y: cy });
    shape.radius(radius);
    // 渐变本地端点随半径缩放，保证渐变覆盖整个形状。
    (shape as Konva.Node).setAttrs({
      fillLinearGradientStartPoint: { x: -radius, y: -radius },
      fillLinearGradientEndPoint: { x: radius, y: radius },
      fillRadialGradientEndRadius: radius,
    });
    // 切换总开关：决定四套数据里哪一套生效。
    shape.fillPriority(current.fillPriority);

    layer.batchDraw();

    emit({
      fillPriority: current.fillPriority,
      activeFill: ACTIVE_LABEL[current.fillPriority],
    });
  }

  // 容器尺寸变化时重读宽高并重绘（位置、半径、渐变端点都要随尺寸更新）。
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
    },
  };
}
