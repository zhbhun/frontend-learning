/**
 * 演示内容：@leafer-in/arrow 的 Arrow 元素——一条带端点箭头的折线，
 *           起点 / 终点箭头自动跟随各自端点所在线段的切线方向（端点跟随）。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           本课公开输入：endArrow（终点箭头类型）、startArrow（起点箭头类型）、
 *                         strokeWidth（描边宽度，同时决定箭头基准尺寸）、arrowScale（{ type, scale } 的缩放倍数）。
 * 主要操作：new Leafer({ view: canvas }) 复用传入 <canvas>；
 *           new Arrow({ points: 折线坐标, stroke, strokeWidth, startArrow, endArrow })；
 *           endArrow / startArrow 用对象形式 { type, scale } 传入，scale 由 arrowScale 控制（在 strokeWidth 基准之上再缩放）；
 *           update(options) 重建 Arrow 节点——端点跟随由引擎按路径自动计算，无需手设方向。
 * 预期结果：折线为 L 形拐角（首段水平、末段竖直）→ 起点箭头朝左、终点箭头朝上，两端指向不同方向；
 *           切换箭头类型 → 端点箭头形状变化；调 strokeWidth → 线与箭头同步放大；
 *           调 arrowScale → 仅箭头在 strokeWidth 基础上再缩放，线条粗细不变。
 * 阅读主线：createArrowScene → Leafer 配置(view) → buildArrow（points + {type,scale} 端点）→ update 重建 → dispose 销毁。
 */
import { Leafer, Group, Ellipse, Text } from 'leafer-ui';
import { Arrow } from '@leafer-in/arrow';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ArrowEndType =
  | 'none'
  | 'angle'
  | 'angle-side'
  | 'arrow'
  | 'triangle'
  | 'triangle-flip'
  | 'circle'
  | 'circle-line'
  | 'square'
  | 'square-line'
  | 'diamond'
  | 'diamond-line'
  | 'mark';

export interface ArrowDemoOptions {
  endArrow: ArrowEndType;
  startArrow: ArrowEndType;
  strokeWidth: number;
  arrowScale: number;
}

export interface ArrowDemoSnapshot {
  /** 终点箭头类型名（读者选择）。 */
  endArrow: string;
  /** 起点箭头类型名；'none' 表示无起点箭头。 */
  startArrow: string;
  /** 描边宽度（同时是箭头基准尺寸）。 */
  strokeWidth: number;
  /** { type, scale } 的 scale 倍数。 */
  arrowScale: number;
}

export interface ArrowDemoInstance {
  update(options: ArrowDemoOptions): void;
  dispose(): void;
}

// 折线坐标（围绕本地原点）：从左下 → 右下 → 右上，构成 L 形拐角。
// 首段水平、末段竖直，使两端箭头自然指向不同方向（端点跟随的可观察证据）。
const POINTS: number[] = [-140, 80, 140, 80, 140, -80];

const STROKE = '#32cd79';

export function createArrowScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ArrowDemoSnapshot) => void,
): ArrowDemoInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // Arrow 与标记层都以画布中心为本地原点：x/y 设到中心，points 围绕 (0,0) 定义即可让 L 形折线居中。
  let centerX = initial.width / 2;
  let centerY = initial.height / 2;

  let arrow: Arrow | null = null;

  // 顶点标记层：把折线的三个顶点画成浅灰小圆点，让"这是一条折线"肉眼可辨，
  // 也让两端箭头指向不同方向的原因（首末段方向不同）一目了然。
  const markers = new Group({ x: centerX, y: centerY });
  for (let i = 0; i < POINTS.length; i += 2) {
    markers.add(
      new Ellipse({
        x: POINTS[i] - 4,
        y: POINTS[i + 1] - 4,
        width: 8,
        height: 8,
        fill: '#cbd5e1',
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    );
  }
  leafer.add(markers);

  leafer.add(
    new Text({
      text: 'Arrow · points 折线 + 端点跟随（起点箭头朝左，终点箭头朝上）',
      x: 16,
      y: 12,
      fontSize: 13,
      fill: '#64748b',
    }),
  );

  let current: ArrowDemoOptions = {
    endArrow: 'arrow',
    startArrow: 'angle',
    strokeWidth: 5,
    arrowScale: 1,
  };

  function buildArrow(options: ArrowDemoOptions): Arrow {
    // startArrow / endArrow 取值 IArrowStyle：字符串=内置样式名，对象 { type, scale, rotation } 可缩放 / 旋转。
    // 这里统一用对象形式，让 arrowScale 在 strokeWidth 基准之上单独缩放箭头（不影响线条粗细）。
    const endArrow =
      options.endArrow === 'none'
        ? 'none'
        : { type: options.endArrow, scale: options.arrowScale };
    const startArrow =
      options.startArrow === 'none'
        ? 'none'
        : { type: options.startArrow, scale: options.arrowScale };

    return new Arrow({
      x: centerX,
      y: centerY,
      points: POINTS,
      cornerRadius: 16, // 圆滑 L 形拐角；端点箭头仍按首末段方向，不受内部圆角影响
      stroke: STROKE,
      strokeWidth: options.strokeWidth,
      strokeCap: 'round',
      strokeJoin: 'round',
      startArrow,
      endArrow,
    });
  }

  function render(options: ArrowDemoOptions) {
    if (arrow) {
      leafer.remove(arrow);
      arrow.destroy();
    }
    arrow = buildArrow(options);
    leafer.add(arrow);
    // 标记层移到最上，保证顶点小圆点不被箭头线遮住。
    leafer.remove(markers);
    leafer.add(markers);

    emit({
      endArrow: options.endArrow,
      startArrow: options.startArrow,
      strokeWidth: options.strokeWidth,
      arrowScale: options.arrowScale,
    });
  }

  render(current);

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布并重新居中折线。
  const resizeObserver = createResizeObserver(canvas, () => {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
    centerX = size.width / 2;
    centerY = size.height / 2;
    if (arrow) {
      arrow.x = centerX;
      arrow.y = centerY;
    }
    markers.x = centerX;
    markers.y = centerY;
  });

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
