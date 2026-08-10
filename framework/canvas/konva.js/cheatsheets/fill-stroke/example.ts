/**
 * 范例介绍：演示 Konva.Shape 的填充、描边、虚线与阴影四组外观属性怎样独立开关、怎样组合。
 * 核心观察——
 *   1. fill 画内部、stroke 画轮廓，二者各有一条「颜色 + 开关」通道：把 fillEnabled 或
 *      strokeEnabled 关掉，即使颜色仍在，对应笔画也消失。
 *   2. dash 只作用于描边：切换虚线模式后轮廓变断续，填充与阴影都不受影响。
 *   3. 阴影由 shadowEnabled 总开关控制：打开后才在「填充 + 描边」整体外圈晕开投影；
 *      shadowBlur 调柔化、shadowOffsetX/Y 调偏移方向。
 * 输入：fill/fillEnabled、stroke/strokeEnabled/strokeWidth、dash（已解析为数组）、
 *      shadowColor/shadowEnabled/shadowBlur/shadowOffsetX/shadowOffsetY。
 * 操作：update(options) 应用属性后用 layer.batchDraw() 重绘；容器尺寸变化时同步 stage 宽高。
 * 预期：圆角矩形始终居中；关掉某条通道对应笔画消失；打开阴影后整体外圈出现可调投影。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface FillStrokeOptions {
  /** 填充颜色（CSS 颜色字符串）。fillEnabled=false 时不绘制。 */
  fill: string;
  fillEnabled: boolean;
  /** 描边颜色。strokeEnabled=false 时不绘制。 */
  stroke: string;
  strokeEnabled: boolean;
  /** 描边宽度（像素）。 */
  strokeWidth: number;
  /** 虚线模式：空数组表示实线，否则为 [线段, 间隔, ...]。 */
  dash: number[];
  /** 阴影颜色；只有 shadowEnabled=true 才绘制阴影。 */
  shadowColor: string;
  shadowEnabled: boolean;
  /** 阴影模糊半径（像素）；0 为硬边阴影。 */
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface FillStrokeSnapshot {
  fill: string;
  fillEnabled: boolean;
  stroke: string;
  strokeEnabled: boolean;
  strokeWidth: number;
  dash: number[];
  shadowColor: string;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface FillStrokeInstance {
  update(options: FillStrokeOptions): void;
  dispose(): void;
}

export function createFillStroke(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FillStrokeSnapshot) => void,
): FillStrokeInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 .cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
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

  // 演示载体：一个居中的圆角矩形。填充、描边、虚线、阴影都挂在它上面。
  const rect = new Konva.Rect({ cornerRadius: 12 });
  layer.add(rect);

  let current: FillStrokeOptions = {
    fill: '#4f7cff',
    fillEnabled: true,
    stroke: '#0f172a',
    strokeEnabled: true,
    strokeWidth: 4,
    dash: [],
    shadowColor: '#000000',
    shadowEnabled: false,
    shadowBlur: 12,
    shadowOffsetX: 8,
    shadowOffsetY: 8,
  };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 矩形居中，并随容器留出足够边距给阴影晕开。
    const rectWidth = Math.max(120, Math.min(280, width - 160));
    const rectHeight = Math.max(80, Math.min(170, height - 160));

    // dash 传空数组时，Canvas 的 setLineDash([]) 等价于实线，无需特殊处理。
    rect.setAttrs({
      x: (width - rectWidth) / 2,
      y: (height - rectHeight) / 2,
      width: rectWidth,
      height: rectHeight,
      cornerRadius: 12,
      fill: current.fill,
      fillEnabled: current.fillEnabled,
      stroke: current.stroke,
      strokeEnabled: current.strokeEnabled,
      strokeWidth: current.strokeWidth,
      dash: current.dash,
      shadowColor: current.shadowColor,
      shadowEnabled: current.shadowEnabled,
      shadowBlur: current.shadowBlur,
      shadowOffsetX: current.shadowOffsetX,
      shadowOffsetY: current.shadowOffsetY,
    });
    layer.batchDraw();

    emit({ ...current });
  }

  // 容器尺寸变化时重读宽高并重绘（矩形需重新居中、阴影边距需重新计算）。
  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
