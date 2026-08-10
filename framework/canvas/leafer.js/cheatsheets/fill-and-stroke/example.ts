/**
 * 演示内容：用 leafer-ui 渲染一个同时填充与描边的六边形 Polygon，集中演示
 *           填充（纯色 / 线性渐变 / 径向渐变）与描边（宽度、虚线、对齐、线帽、拐角）的协同。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入为 填充类型 fill、描边宽度 strokeWidth、虚线 dash、虚线偏移 dashOffset、
 *           描边对齐 strokeAlign、线帽 strokeCap、拐角 strokeJoin。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas>；创建一个 sides=6 的 Polygon 常驻节点，
 *           around:'center' 居中；update(options) 用 node.set({...}) 把填充画法与描边参数直接写回节点，
 *           不重建节点；画布尺寸变化时重算尺寸并重新居中。
 * 预期结果：切换 fill → 纯色 / 线性 / 径向 三种画法；调 strokeWidth / dash / dashOffset → 描边粗细、
 *           虚线节律与起点偏移同步；切 strokeAlign → 描边带在 fill 边界的 内 / 中 / 外 三种位置；
 *           虚线为 0 时拐角（join）最明显，调大虚线后线帽（cap）出现在每个 dash 两端。
 *           左下角读数读出当前填充、描边宽度、虚线（含偏移）、描边对齐、线帽·拐角。
 * 阅读主线：createFillStroke → Leafer 配置(view) → Polygon 创建居中 → buildFill 画法 → update 同步描边 → dispose 销毁。
 */
import { Leafer, Polygon } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FillType = 'solid' | 'linear' | 'radial';
export type StrokeAlignType = 'inside' | 'center' | 'outside';
export type StrokeCapType = 'none' | 'round' | 'square';
export type StrokeJoinType = 'miter' | 'round' | 'bevel';

export interface FillStrokeOptions {
  fill: FillType;
  strokeWidth: number;
  dash: number;
  dashOffset: number;
  strokeAlign: StrokeAlignType;
  strokeCap: StrokeCapType;
  strokeJoin: StrokeJoinType;
}

export interface FillStrokeSnapshot {
  /** 当前填充画法（中文概念名）。 */
  fill: string;
  /** 描边宽度，单位 px；0 表示未画描边。 */
  strokeWidth: string;
  /** 虚线：无 或 [dash, gap] 起点偏移。 */
  dash: string;
  /** 描边对齐：inside / center / outside。 */
  strokeAlign: string;
  /** 线帽 · 拐角。 */
  capJoin: string;
}

export interface FillStrokeInstance {
  update(options: FillStrokeOptions): void;
  dispose(): void;
}

const STROKE = '#172033';

const FILL_LABELS: Record<FillType, string> = {
  solid: '纯色',
  linear: '线性渐变',
  radial: '径向渐变',
};

// 三种填充画法。纯色直接用字符串；渐变用 paint 对象。
// 线性渐变 from/to 缺省为 'top'/'bottom'（顶到底），这里显式给 'top-left' → 'bottom-right' 形成对角。
// 径向渐变 from 缺省 'center'、to 缺省 'bottom'，半径 = from→to 的距离。
// stops 传字符串数组时，offset 按 i/(len-1) 自动均分（引擎行为）。
function buildFill(type: FillType) {
  switch (type) {
    case 'linear':
      return {
        type: 'linear' as const,
        from: 'top-left' as const,
        to: 'bottom-right' as const,
        stops: ['#4f7cff', '#32cd79'],
      };
    case 'radial':
      return {
        type: 'radial' as const,
        from: 'center' as const,
        to: 'bottom-right' as const,
        stops: ['#4f7cff', '#1f8b5a'],
      };
    case 'solid':
    default:
      // 纯色既可写字符串，也可写 { type: 'solid', color }；字符串最简。
      return '#4f7cff';
  }
}

export function createFillStroke(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FillStrokeSnapshot) => void,
): FillStrokeInstance {
  let current: FillStrokeOptions = {
    fill: 'linear',
    strokeWidth: 8,
    dash: 0,
    dashOffset: 0,
    strokeAlign: 'inside',
    strokeCap: 'none',
    strokeJoin: 'miter',
  };

  // view 直接传入 HTMLCanvasElement 时，Leafer 复用该 <canvas> 作为渲染目标。
  // 不给 width / height 让位，由 readCanvasSize 读出舞台尺寸，舞台变化时用 resize() 同步。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  // 六边形常驻节点：sides=6、直角（cornerRadius=0）让拐角的 join 最清晰。
  // around:'center' 把定位原点移到自身包围盒中心，x/y 直接给画布中心即可居中（完整语义见「变换」课）。
  const polygon = new Polygon({
    sides: 6,
    cornerRadius: 0,
    around: 'center',
  });
  leafer.add(polygon);

  function syncShape() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
    const edge = Math.min(size.width, size.height) * 0.46;
    polygon.set({
      width: edge,
      height: edge,
      x: size.width / 2,
      y: size.height / 2,
    });
  }

  function render(options: FillStrokeOptions) {
    // 描边由 stroke 与 strokeWidth 共同决定：缺任一都不画。strokeWidth=0 即无描边。
    polygon.set({
      fill: buildFill(options.fill),
      stroke: STROKE,
      strokeWidth: options.strokeWidth,
      strokeAlign: options.strokeAlign,
      strokeCap: options.strokeCap,
      strokeJoin: options.strokeJoin,
      // dash 为 0 → 不设 dashPattern（实线）；>0 → [dash, gap] 等距虚线。
      dashPattern: options.dash > 0 ? [options.dash, options.dash] : undefined,
      dashOffset: options.dashOffset,
    });

    emit({
      fill: FILL_LABELS[options.fill],
      strokeWidth:
        options.strokeWidth > 0 ? `${options.strokeWidth}px` : '0（无描边）',
      dash:
        options.dash > 0
          ? `[${options.dash}, ${options.dash}] 偏移 ${options.dashOffset}`
          : '无',
      strokeAlign: options.strokeAlign,
      capJoin: `${options.strokeCap} · ${options.strokeJoin}`,
    });
  }

  // 舞台尺寸变化（Docs 面板开合）时重置画布尺寸、重排居中、再重画描边。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncShape();
    render(current);
  });

  syncShape();
  render(current);

  return {
    update(options) {
      current = options;
      render(options);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
