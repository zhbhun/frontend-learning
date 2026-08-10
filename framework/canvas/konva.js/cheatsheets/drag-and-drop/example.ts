/**
 * 范例介绍：演示 Konva 拖拽的三个核心机制——开启拖拽、拖拽事件、约束与对齐。
 *
 * 一个可拖拽的圆形作为主角。读者通过 Controls 切换「约束模式」与「网格步长」，
 * 直接拖动圆形即可观察不同约束如何改写位置：
 *   - 自由：draggable 生效，节点跟随指针，无任何约束。
 *   - 仅水平 / 仅竖直：dragBoundFunc 锁定单轴，演示位置拦截。
 *   - 限定区域：dragBoundFunc 把位置夹取到矩形范围内。
 *   - 网格吸附：dragBoundFunc 把位置舍入到步长倍数，实现网格对齐。
 *
 * 输入：mode（约束模式）、snapStep（网格步长）。
 * 预期：读数「位置」「状态」「约束」随拖拽实时更新；切换模式后约束立刻生效。
 * 阅读主线：搭建舞台 → 设置 draggable 与事件 → 用 dragBoundFunc 拦截 pos 实现
 *   锁轴 / 区域 / 吸附，并更新引导线辅助观察。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DragMode = 'free' | 'horizontal' | 'vertical' | 'box' | 'grid';

export interface DragOptions {
  /** 约束模式：决定 dragBoundFunc 如何改写拖拽位置。 */
  mode: DragMode;
  /** 网格步长（像素）：仅「网格吸附」模式生效。 */
  snapStep: number;
}

export interface DragSnapshot {
  /** 节点当前位置（圆心，舞台坐标）。 */
  x: number;
  y: number;
  /** 拖拽状态：dragstart 置 dragging，dragend 置 idle。 */
  state: 'idle' | 'dragging';
  /** 当前约束模式。 */
  mode: DragMode;
  /** 网格步长。 */
  snapStep: number;
}

export interface DragInstance {
  update(options: DragOptions): void;
  dispose(): void;
}

// 视觉常量。
const RADIUS = 28;
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const GRID_COLOR = '#cbd5e1';
const AXIS_COLOR = '#f59e0b';
const BOX_COLOR = '#22c55e';
const GUIDE_DASH = [6, 4];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createDragDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DragSnapshot) => void,
): DragInstance {
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

  // === 当前可变状态（由 update 写入，由 draw / dragBoundFunc 读取） ===
  let currentMode: DragMode = 'free';
  let currentSnapStep = 40;
  let dragState: 'idle' | 'dragging' = 'idle';

  // === 引导线：随模式切换显隐，帮助读者看见约束边界 ===

  // 网格：仅在「网格吸附」模式可见。sceneFunc 实时读取舞台尺寸与步长。
  const grid = new Konva.Shape({
    listening: false,
    stroke: GRID_COLOR,
    strokeWidth: 1,
    dash: GUIDE_DASH,
    visible: false,
    sceneFunc(context, shape) {
      const width = stage.width();
      const height = stage.height();
      const step = Math.max(8, currentSnapStep);
      context.beginPath();
      for (let x = 0; x <= width; x += step) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.fillStrokeShape(shape);
    },
  });
  layer.add(grid);

  // 限定区域矩形：仅在「限定区域」模式可见。
  const boxRect = new Konva.Rect({
    listening: false,
    stroke: BOX_COLOR,
    strokeWidth: 1.5,
    dash: GUIDE_DASH,
    visible: false,
  });
  layer.add(boxRect);

  // 锁轴引导线：仅在「仅水平 / 仅竖直」模式可见。
  const axisH = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: AXIS_COLOR,
    strokeWidth: 1.5,
    dash: GUIDE_DASH,
    listening: false,
    visible: false,
  });
  const axisV = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: AXIS_COLOR,
    strokeWidth: 1.5,
    dash: GUIDE_DASH,
    listening: false,
    visible: false,
  });
  layer.add(axisH, axisV);

  // === 主角：可拖拽圆形 ===
  const circle = new Konva.Circle({
    x: Math.round(initial.width / 2),
    y: Math.round(initial.height / 2),
    radius: RADIUS,
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    draggable: true,
    shadowColor: 'rgba(15, 23, 42, 0.22)',
    shadowBlur: 10,
    shadowOffsetY: 2,
  });
  layer.add(circle);

  // 矩形约束区域：相对舞台尺寸的留白区域。
  function computeBox() {
    const width = stage.width();
    const height = stage.height();
    const marginX = width * 0.18;
    const marginY = height * 0.2;
    return {
      left: marginX,
      top: marginY,
      right: width - marginX,
      bottom: height - marginY,
    };
  }

  // === dragBoundFunc：拖拽位置拦截 ===
  // pos 是节点将被移动到的绝对位置；必须返回绝对位置。dragBoundFunc 在节点
  // 定位之前调用，因此锁轴 / 区域 / 吸附都会在读者看到移动前生效，不会闪烁。
  circle.dragBoundFunc((pos) => {
    if (currentMode === 'horizontal') {
      // 仅水平：x 跟随指针，y 锁定在当前位置。
      return { x: pos.x, y: circle.absolutePosition().y };
    }
    if (currentMode === 'vertical') {
      return { x: circle.absolutePosition().x, y: pos.y };
    }
    if (currentMode === 'box') {
      const box = computeBox();
      return {
        x: clamp(pos.x, box.left, box.right),
        y: clamp(pos.y, box.top, box.bottom),
      };
    }
    if (currentMode === 'grid') {
      const step = Math.max(8, currentSnapStep);
      return {
        x: Math.round(pos.x / step) * step,
        y: Math.round(pos.y / step) * step,
      };
    }
    // 自由：不做改写。
    return pos;
  });

  // === 拖拽事件：更新读数与状态 ===
  circle.on('dragstart', () => {
    dragState = 'dragging';
    emitSnapshot();
  });
  circle.on('dragmove', () => {
    emitSnapshot();
  });
  circle.on('dragend', () => {
    dragState = 'idle';
    emitSnapshot();
  });

  function emitSnapshot() {
    emit({
      x: Math.round(circle.x()),
      y: Math.round(circle.y()),
      state: dragState,
      mode: currentMode,
      snapStep: currentSnapStep,
    });
  }

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 引导线按当前模式显隐与定位。
    grid.visible(currentMode === 'grid');
    boxRect.visible(currentMode === 'box');
    axisH.visible(currentMode === 'horizontal');
    axisV.visible(currentMode === 'vertical');

    if (currentMode === 'box') {
      const box = computeBox();
      boxRect.setAttrs({
        x: box.left,
        y: box.top,
        width: Math.max(0, box.right - box.left),
        height: Math.max(0, box.bottom - box.top),
      });
    }
    if (currentMode === 'horizontal') {
      axisH.points([0, circle.y(), width, circle.y()]);
    }
    if (currentMode === 'vertical') {
      axisV.points([circle.x(), 0, circle.x(), height]);
    }

    layer.batchDraw();
    emitSnapshot();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      currentMode = options.mode;
      currentSnapStep = options.snapStep;

      // 进入约束模式时把圆形归位到合法范围，让约束视觉立刻一致。
      if (currentMode === 'grid') {
        const step = Math.max(8, currentSnapStep);
        circle.position({
          x: Math.round(circle.x() / step) * step,
          y: Math.round(circle.y() / step) * step,
        });
      } else if (currentMode === 'box') {
        const box = computeBox();
        circle.position({
          x: clamp(circle.x(), box.left, box.right),
          y: clamp(circle.y(), box.top, box.bottom),
        });
      }

      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
