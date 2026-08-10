/**
 * 范例介绍：演示 Konva.Line 的「一个类、四种形态」。
 * 核心观察——同一组 points，仅靠 closed 与 tension 两个开关，就在
 *   折线、样条曲线、多边形、闭合曲线 (blob) 之间切换：
 *   - closed=false, tension=0  → 折线（直线段连接各顶点，只描边、不填充）
 *   - closed=false, tension>0  → 样条曲线（tension 在顶点间平滑插值）
 *   - closed=true,  tension=0  → 多边形（闭合，可填充）
 *   - closed=true,  tension>0  → 闭合曲线 / blob（闭合且平滑）
 * Konva.Line 的 _sceneFunc 对 open 只调 strokeShape、对 closed 才调
 *   fillStrokeShape，因此「闭合才出现 fill」是引擎行为，不是样式巧合。
 * 每个顶点用小圆点标出，让读者看到：tension 只是「在顶点之间插值」，
 *   顶点本身（points 数组）始终是几何的真源。
 *
 * 输入：pointCount（顶点数）、tension（0–1）、closed（是否闭合）。
 * 操作：update(options) 重算 points、应用 closed/tension 后用 layer.batchDraw() 重绘；
 *   尺寸变化时同步 stage 宽高。
 * 预期：拨动 closed / tension，形态在四种之间切换；顶点小圆点位置不变。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface LineFamilyOptions {
  /** 顶点数：围绕椭圆均匀分布的点数，决定 points 数组长度。 */
  pointCount: number;
  /** tension：0 = 直线段；>0 = 在顶点间平滑插值（样条）。 */
  tension: number;
  /** closed：false = 开放线（只描边）；true = 闭合（首尾相连，可填充）。 */
  closed: boolean;
}

export interface LineFamilySnapshot {
  pointCount: number;
  tension: number;
  closed: boolean;
  /** 当前形态：折线 / 样条曲线 / 多边形 / 闭合曲线。 */
  mode: string;
}

export interface LineFamilyInstance {
  update(options: LineFamilyOptions): void;
  dispose(): void;
}

// 视觉常量：描边、填充（闭合时显示）与顶点标记颜色。
const STROKE = '#4f7cff';
const STROKE_WIDTH = 3;
const FILL = 'rgba(79, 124, 255, 0.18)';
const MARKER = '#1e293b';

export function createLineFamily(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LineFamilySnapshot) => void,
): LineFamilyInstance {
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

  // 主形状：Konva.Line。points / closed / tension 都在 draw() 里按控件更新。
  const line = new Konva.Line({
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fill: FILL,
    lineJoin: 'round',
    lineCap: 'round',
  });
  layer.add(line);

  // 顶点标记容器：每个顶点一个小圆点，数量随 pointCount 变化。
  // 用 listening:false 关闭事件，避免标记干扰命中。
  const markerGroup = new Konva.Group({ listening: false });
  layer.add(markerGroup);

  let current: LineFamilyOptions = {
    pointCount: 5,
    tension: 0,
    closed: false,
  };

  // 根据顶点数与画布尺寸，生成围绕椭圆均匀分布的 points（一维交替数组）。
  function computePoints(
    count: number,
    width: number,
    height: number,
  ): number[] {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const r = Math.min(width, height) * 0.34;
    const rx = r;
    const ry = r * 0.82;
    const startAngle = -Math.PI / 2; // 从正上方开始顺时针布置
    const pts: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const angle = startAngle + (i / count) * Math.PI * 2;
      pts.push(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
    }
    return pts;
  }

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    const pts = computePoints(current.pointCount, width, height);

    (line as Konva.Node).setAttrs({
      points: pts,
      closed: current.closed,
      tension: current.tension,
    });

    // 重建顶点标记，使其数量与 pointCount 一致、位置贴合当前 points。
    markerGroup.removeChildren();
    for (let i = 0; i < current.pointCount; i += 1) {
      markerGroup.add(
        new Konva.Circle({
          x: pts[i * 2],
          y: pts[i * 2 + 1],
          radius: 4,
          fill: MARKER,
        }),
      );
    }

    layer.batchDraw();

    // 由 closed 与 tension 派生当前形态名称（points 始终是几何真源）。
    let mode: string;
    if (current.closed && current.tension > 0) {
      mode = '闭合曲线 (blob)';
    } else if (current.closed) {
      mode = '多边形';
    } else if (current.tension > 0) {
      mode = '样条曲线';
    } else {
      mode = '折线';
    }

    emit({
      pointCount: current.pointCount,
      tension: current.tension,
      closed: current.closed,
      mode,
    });
  }

  // 容器尺寸变化时重读宽高并重绘（points 布局依赖画布尺寸）。
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
