/**
 * 范例介绍：演示 Konva Group 的核心机制——变换继承。
 * Group 的子节点坐标始终相对 Group 的本地坐标系。改变 Group 的位置或旋转，
 * 所有子节点作为整体一起变换，但子节点的本地坐标不变，只有绝对坐标变化。
 *
 * 输入：组 x、组 y、组 rotation。
 * 视觉：Group 内含一条水平臂（骨架线 + 中段矩形 + 末端圆），臂的本地坐标固定；
 *   Group 原点处有十字标记；舞台层有一条虚线弧，标出末端圆随旋转划出的轨迹。
 * 预期：末端圆的本地坐标始终为 (ARM_LENGTH, 0)，只有绝对坐标随 Group 变换而变化。
 * 阅读主线：createGroup 搭建舞台 → 组装 Group 子节点 → draw 应用变换并用
 *   getAbsolutePosition() 取末端圆绝对坐标，证明变换继承。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface GroupOptions {
  /** Group 在舞台上的水平位置（舞台坐标）。 */
  groupX: number;
  /** Group 在舞台上的竖直位置（舞台坐标）。 */
  groupY: number;
  /** Group 的旋转角度（度），子节点绕 Group 原点整体旋转。 */
  groupRotation: number;
}

export interface GroupSnapshot {
  /** Group 当前变换。 */
  groupX: number;
  groupY: number;
  groupRotation: number;
  /** 末端圆的本地坐标（相对 Group，固定不变）。 */
  circleLocalX: number;
  circleLocalY: number;
  /** 末端圆的绝对坐标（随 Group 变换变化）。 */
  circleAbsX: number;
  circleAbsY: number;
}

export interface GroupInstance {
  update(options: GroupOptions): void;
  dispose(): void;
}

// 臂的长度：末端圆的本地 x 坐标。
const ARM_LENGTH = 120;

// 视觉常量：填充、描边、参考轨迹与原点标记的颜色。
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const ARM_COLOR = '#4f7cff';
const RECT_FILL = '#22c55e';
const TIP_FILL = '#f59e0b';
const ORIGIN_COLOR = '#ef4444';
const GUIDE = '#cbd5e1';

export function createGroup(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GroupSnapshot) => void,
): GroupInstance {
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

  // 舞台层（Group 外）的引导弧线：标出末端圆随旋转划出的圆形轨迹。
  // 它不随 Group 旋转，因此放在 layer 而非 group 中。
  const guideArc = new Konva.Circle({
    radius: ARM_LENGTH,
    stroke: GUIDE,
    strokeWidth: 1,
    dash: [5, 5],
    listening: false,
  });
  layer.add(guideArc);

  // === Group：组织子节点的容器，本身不绘制 ===
  const group = new Konva.Group({
    x: initial.width * 0.3,
    y: initial.height * 0.5,
    rotation: 0,
  });
  layer.add(group);

  // 臂的骨架线：从本地原点 (0,0) 水平向右延伸 ARM_LENGTH。
  const armLine = new Konva.Line({
    points: [0, 0, ARM_LENGTH, 0],
    stroke: ARM_COLOR,
    strokeWidth: 6,
    lineCap: 'round',
    listening: false,
  });
  group.add(armLine);

  // 臂中段的矩形：本地坐标 (ARM_LENGTH * 0.42, -14)，左上角定位。
  const armRect = new Konva.Rect({
    x: ARM_LENGTH * 0.42,
    y: -14,
    width: 34,
    height: 28,
    fill: RECT_FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    cornerRadius: 4,
  });
  group.add(armRect);

  // 末端圆：本地坐标 (ARM_LENGTH, 0)，中心定位——这是读数追踪的节点。
  const tipCircle = new Konva.Circle({
    x: ARM_LENGTH,
    y: 0,
    radius: 16,
    fill: TIP_FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  group.add(tipCircle);

  // 末端圆的本地坐标标签：在 Group 内，跟随 Group 变换一起旋转。
  const tipLabel = new Konva.Text({
    text: `本地 (${ARM_LENGTH}, 0)`,
    x: ARM_LENGTH + 22,
    y: -8,
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: TIP_FILL,
    listening: false,
  });
  group.add(tipLabel);

  // Group 原点标记：十字 + 小圆，标出本地 (0,0)——旋转的中心。
  const origin = new Konva.Group({ listening: false });
  origin.add(
    new Konva.Line({
      points: [-9, 0, 9, 0],
      stroke: ORIGIN_COLOR,
      strokeWidth: 2,
    }),
  );
  origin.add(
    new Konva.Line({
      points: [0, -9, 0, 9],
      stroke: ORIGIN_COLOR,
      strokeWidth: 2,
    }),
  );
  origin.add(new Konva.Circle({ radius: 4, fill: ORIGIN_COLOR }));
  group.add(origin);

  let current: GroupOptions = {
    groupX: initial.width * 0.3,
    groupY: initial.height * 0.5,
    groupRotation: 0,
  };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 应用 Group 变换：子节点的本地坐标不需要改动。
    group.setAttrs({
      x: current.groupX,
      y: current.groupY,
      rotation: current.groupRotation,
    });

    // 引导弧线始终以 Group 位置为圆心。
    guideArc.position({ x: current.groupX, y: current.groupY });

    layer.batchDraw();

    // getAbsolutePosition 汇总所有祖先变换，返回节点在舞台坐标系中的位置。
    // 本地坐标固定为 (ARM_LENGTH, 0)，绝对坐标随 Group 变换而变化。
    const abs = tipCircle.getAbsolutePosition();
    emit({
      groupX: Math.round(current.groupX),
      groupY: Math.round(current.groupY),
      groupRotation: current.groupRotation,
      circleLocalX: ARM_LENGTH,
      circleLocalY: 0,
      circleAbsX: Math.round(abs.x),
      circleAbsY: Math.round(abs.y),
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
