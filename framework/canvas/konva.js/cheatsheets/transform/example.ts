/**
 * 范例介绍：演示 Konva 节点的仿射变换属性（位置、缩放、旋转、偏斜、偏移）与层级（z-index）。
 *
 * 两个独立实例：
 * 1. createPlayground：单个矩形承载 x/y、rotation、scaleX/scaleY、skewX/skewY、offsetX/offsetY。
 *    橙色十字标记「变换枢轴」（= 位置 x,y）；灰色虚线框是「仅应用位置与 offset、变换归零」的
 *    同位置参照，用来对比旋转/缩放/偏斜围绕枢轴的效果。读数给出各项当前值。
 * 2. createStacking：两个重叠矩形，用 mainOnTop 切换 zIndex，演示层级方法。
 *
 * 关键模型：位置 (x,y) 是变换枢轴；offset 决定形体的哪个局部点钉在枢轴上。
 * 输入：update(options) 应用属性后 layer.batchDraw()；尺寸变化时同步 stage 宽高。
 * 预期：每个控件都能在画布上看到对应属性的直接视觉效果，枢轴固定在 (x,y)。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/* ===================== 仿射变换 playground ===================== */

export interface TransformOptions {
  /** 位置 x：变换枢轴在父坐标系里的横坐标。矩形把它当作左上角。 */
  x: number;
  /** 位置 y：变换枢轴的纵坐标。 */
  y: number;
  /** 旋转角度（默认度，Konva.angleDeg = true）。 */
  rotation: number;
  /** 横向缩放，默认 1；负值水平翻转。 */
  scaleX: number;
  /** 纵向缩放，默认 1；负值垂直翻转。 */
  scaleY: number;
  /** 横向偏斜量，默认 0。 */
  skewX: number;
  /** 纵向偏斜量，默认 0。 */
  skewY: number;
  /** 偏移 X：钉在枢轴上的局部点横坐标，默认 0。 */
  offsetX: number;
  /** 偏移 Y：钉在枢轴上的局部点纵坐标，默认 0。 */
  offsetY: number;
}

export interface TransformSnapshot {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  offsetX: number;
  offsetY: number;
}

export interface TransformInstance {
  update(options: TransformOptions): void;
  dispose(): void;
}

// 视觉常量
const RECT_W = 120;
const RECT_H = 80;
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const GHOST_STROKE = '#94a3b8';
const PIVOT_COLOR = '#f59e0b'; // 橙色：变换枢轴

export function createPlayground(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransformSnapshot) => void,
): TransformInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
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

  // 灰色虚线「参照框」：与主矩形同位置、同 offset，但变换归零（rotation 0 / scale 1 / skew 0）。
  // 用来对比：枢轴不动，主矩形围绕枢轴旋转 / 缩放 / 偏斜。
  const ghost = new Konva.Rect({
    width: RECT_W,
    height: RECT_H,
    stroke: GHOST_STROKE,
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  });
  layer.add(ghost);

  // 主矩形：承载全部变换属性。
  const rect = new Konva.Rect({
    width: RECT_W,
    height: RECT_H,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  layer.add(rect);

  // 枢轴标记：十字 + 中心圆点，始终位于 (x, y)。最后加入 → 画在最上层，永不被遮挡。
  const pivot = new Konva.Group({ listening: false });
  pivot.add(
    new Konva.Line({ points: [-8, 0, 8, 0], stroke: PIVOT_COLOR, strokeWidth: 2 }),
    new Konva.Line({ points: [0, -8, 0, 8], stroke: PIVOT_COLOR, strokeWidth: 2 }),
    new Konva.Circle({ radius: 3, fill: PIVOT_COLOR }),
  );
  layer.add(pivot);

  let current: TransformOptions = {
    x: 170,
    y: 110,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 主矩形：应用全部变换。位置 (x,y) = 枢轴；offset 把指定局部点钉到枢轴。
    rect.setAttrs({
      x: current.x,
      y: current.y,
      rotation: current.rotation,
      scaleX: current.scaleX,
      scaleY: current.scaleY,
      skewX: current.skewX,
      skewY: current.skewY,
      offsetX: current.offsetX,
      offsetY: current.offsetY,
    });

    // 参照框：只设位置与 offset，其余变换属性保持默认（rotation 0 / scale 1 / skew 0）。
    ghost.setAttrs({
      x: current.x,
      y: current.y,
      offsetX: current.offsetX,
      offsetY: current.offsetY,
    });

    // 枢轴始终在 (x, y)。
    pivot.position({ x: current.x, y: current.y });

    layer.batchDraw();
    emit({ ...current });
  }

  // 容器尺寸变化时重读宽高并重绘。
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

/* ===================== 层级 stacking ===================== */

export interface StackingOptions {
  /** true：主形状（蓝）移到顶层；false：移到底层。 */
  mainOnTop: boolean;
}

export interface StackingSnapshot {
  mainZ: number;
  otherZ: number;
  front: string;
}

export interface StackingInstance {
  update(options: StackingOptions): void;
  dispose(): void;
}

const OTHER_FILL = '#f59e0b';

export function createStacking(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StackingSnapshot) => void,
): StackingInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
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

  // 琥珀色「参考形状」与蓝色「主形状」互相重叠，共用同一个 Layer（同一父节点），
  // 这样两者的 zIndex 才在同一范围内可比。
  const other = new Konva.Rect({
    x: 200,
    y: 120,
    width: RECT_W,
    height: RECT_H,
    fill: OTHER_FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  const main = new Konva.Rect({
    x: 150,
    y: 85,
    width: RECT_W,
    height: RECT_H,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  // 先加 other，再加 main：默认 main 在上（zIndex 1）。
  layer.add(other, main);

  let current: StackingOptions = { mainOnTop: true };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // zIndex 方法只在同一父节点的子节点间排序。
    if (current.mainOnTop) {
      main.moveToTop();
    } else {
      main.moveToBottom();
    }

    layer.batchDraw();
    emit({
      mainZ: main.zIndex(),
      otherZ: other.zIndex(),
      front: current.mainOnTop ? '蓝色主形状' : '琥珀参考形状',
    });
  }

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
