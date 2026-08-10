/**
 * 范例介绍：演示 Konva 矩形、圆、椭圆三种基本形状的创建与定位。
 * 核心观察——三种形状共用同一个「位置 x」，但定位语义不同：
 *   矩形的 x/y 是「左上角」，圆与椭圆的 x/y 是「中心」。
 * 拖动控件「位置 x」，竖直参考线随之移动：矩形左边贴线（角在线上），
 * 圆与椭圆中心压线（形体跨过线两侧）。读数同时给出各自的水平范围，
 * 让「角定位」与「中心定位」的差异既可见、也可核对。
 *
 * 输入：位置 x、矩形宽高与 cornerRadius、圆半径、椭圆 radiusX/radiusY。
 * 操作：update(options) 应用属性后用 layer.batchDraw() 重绘；尺寸变化时同步 stage 宽高。
 * 预期：三种形状始终共用同一 x，参考线穿过各自的定位参考点。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ShapesOptions {
  /** 三种形状共用的水平位置 x：矩形把它当作左边，圆 / 椭圆把它当作中心。 */
  x: number;
  rectWidth: number;
  rectHeight: number;
  /** 矩形圆角：单个数值或四角数组。范例控件用单个数值。 */
  cornerRadius: number;
  circleRadius: number;
  ellipseRadiusX: number;
  ellipseRadiusY: number;
}

export interface ShapesSnapshot {
  /** 共用的 x 坐标。 */
  x: number;
  /** 矩形水平范围（左上角 = x，因此左边等于 x）。 */
  rectLeft: number;
  rectRight: number;
  /** 圆水平范围（中心 = x，因此左右两边相对 x 对称）。 */
  circleLeft: number;
  circleRight: number;
  /** 椭圆水平范围（中心 = x）。 */
  ellipseLeft: number;
  ellipseRight: number;
}

export interface ShapesInstance {
  update(options: ShapesOptions): void;
  dispose(): void;
}

// 视觉常量：填充、描边、参考线与定位点的颜色。
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const GUIDE = '#94a3b8';
const MARKER = '#1e293b';

export function createShapes(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ShapesSnapshot) => void,
): ShapesInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const container = canvas.parentElement as HTMLDivElement | null;
  if (!container) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  container.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // 竖直参考线：标注三种形状共用的 x 坐标。
  const guide = new Konva.Line({
    points: [0, 0, 0, initial.height],
    stroke: GUIDE,
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  });
  layer.add(guide);

  // 三个定位点：落在参考线上，标记每种形状的「定位参考点」。
  const rectMarker = new Konva.Circle({
    radius: 3,
    fill: MARKER,
    listening: false,
  });
  const circleMarker = new Konva.Circle({
    radius: 3,
    fill: MARKER,
    listening: false,
  });
  const ellipseMarker = new Konva.Circle({
    radius: 3,
    fill: MARKER,
    listening: false,
  });
  layer.add(rectMarker, circleMarker, ellipseMarker);

  // 三种基本形状：矩形（角定位）、圆与椭圆（中心定位）。
  const rect = new Konva.Rect({
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  const circle = new Konva.Circle({
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  const ellipse = new Konva.Ellipse({
    radiusX: 0,
    radiusY: 0,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  layer.add(rect, circle, ellipse);

  let current: ShapesOptions = {
    x: 140,
    rectWidth: 130,
    rectHeight: 86,
    cornerRadius: 0,
    circleRadius: 52,
    ellipseRadiusX: 64,
    ellipseRadiusY: 34,
  };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 三行布局：矩形在上方、圆在中部、椭圆在下方，三者共用同一个 x。
    const rectTop = Math.round(height * 0.14);
    const circleY = Math.round(height * 0.5);
    const ellipseY = Math.round(height * 0.82);

    guide.points([current.x, 0, current.x, height]);

    // 矩形：x/y 是左上角，因此 x = 参考线，形体向右延伸。
    rect.setAttrs({
      x: current.x,
      y: rectTop,
      width: current.rectWidth,
      height: current.rectHeight,
      cornerRadius: current.cornerRadius,
    });
    rectMarker.position({ x: current.x, y: rectTop });

    // 圆：x/y 是中心，因此形体相对参考线左右对称。
    circle.setAttrs({
      x: current.x,
      y: circleY,
      radius: current.circleRadius,
    });
    circleMarker.position({ x: current.x, y: circleY });

    // 椭圆：x/y 是中心，radiusX / radiusY 独立，因此可压成扁圆。
    ellipse.setAttrs({
      x: current.x,
      y: ellipseY,
      radiusX: current.ellipseRadiusX,
      radiusY: current.ellipseRadiusY,
    });
    ellipseMarker.position({ x: current.x, y: ellipseY });

    layer.batchDraw();

    emit({
      x: current.x,
      rectLeft: current.x,
      rectRight: current.x + current.rectWidth,
      circleLeft: current.x - current.circleRadius,
      circleRight: current.x + current.circleRadius,
      ellipseLeft: current.x - current.ellipseRadiusX,
      ellipseRight: current.x + current.ellipseRadiusX,
    });
  }

  // 容器尺寸变化时重读宽高并重绘（参考线、定位点都要随高度更新）。
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
