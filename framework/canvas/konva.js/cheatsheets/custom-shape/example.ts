/**
 * 范例介绍：演示 Konva.Shape + sceneFunc 绘制 Konva 没有内置的「齿轮」。
 * 核心观察——自定义形状的契约只有三步：
 *   1. sceneFunc(context, shape) 收到 Konva.Context（包装原生 2D context）；
 *   2. 你用 context 的 Canvas 2D API（beginPath / moveTo / lineTo / arc / closePath…）构建路径；
 *   3. 调一句 context.fillStrokeShape(shape)，让 Konva 按 shape 的 fill / stroke / fillRule 上色。
 * sceneFunc 里完全不碰颜色：fill / stroke 设在 shape 上，由 fillStrokeShape 桥接。
 *
 * 几何说明：齿轮由「每齿四点」绕中心循环生成（谷入 → 齿顶起 → 齿顶止 → 谷出），
 *   中心孔是第二个子路径，配合 shape 的 fillRule:'evenodd' 镂空。
 *   画在 (0, 0)，由 shape.position 负责定位——Konva 接管平移 / 旋转等变换。
 *
 * 输入：teeth（齿数，驱动 sceneFunc 循环）、holeRatio（中心孔占比，0 = 实心）。
 * 操作：update(options) 把几何写入 shape 自定义属性，再用 layer.batchDraw() 重绘；
 *   尺寸变化时重算外径并同步 stage 宽高。
 * 预期：拨动齿数，齿轮边数随之变化；拨动孔径比，中心孔出现 / 消失；
 *   fill / stroke 始终由 shape 属性决定，sceneFunc 里没有任何颜色。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface GearOptions {
  /** 齿数：驱动 sceneFunc 的顶点循环，直接决定齿轮边数。 */
  teeth: number;
  /** 中心孔占比 = holeRadius / outerRadius；0 = 无孔（单子路径，实心）。 */
  holeRatio: number;
}

export interface GearSnapshot {
  teeth: number;
  outerRadius: number;
  valleyRadius: number;
  holeRadius: number;
  /** 路径顶点数：每齿 4 点。 */
  vertexCount: number;
  /** 子路径数：1 = 实心（仅外轮廓）；2 = 带中心孔（外轮廓 + 孔，evenodd 镂空）。 */
  subpathCount: number;
}

export interface GearInstance {
  update(options: GearOptions): void;
  dispose(): void;
}

// 视觉常量：填充、描边与齿谷比（齿谷半径 / 外径）。
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const VALLEY_RATIO = 0.72;

export function createCustomShape(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GearSnapshot) => void,
): GearInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数 / 说明。Konva.Stage 建立
  // 时会清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数与说明；默认 canvas 隐藏，改由 Konva 的图层
  // canvas 承载绘制。
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

  // 自定义齿轮：sceneFunc 负责几何，fill / stroke / fillRule 设在 shape 上。
  // teeth / outerRadius / valleyRadius / holeRadius 是自定义属性，
  // sceneFunc 通过 shape.getAttr 读取——展示第二个参数 shape 的用途。
  const gear = new Konva.Shape({
    sceneFunc(context: Konva.Context, shape: Konva.Shape) {
      const teeth = shape.getAttr('teeth') as number;
      const outerR = shape.getAttr('outerRadius') as number;
      const valleyR = shape.getAttr('valleyRadius') as number;
      const holeR = shape.getAttr('holeRadius') as number;
      const slice = (Math.PI * 2) / teeth;

      context.beginPath();
      for (let i = 0; i < teeth; i += 1) {
        const a = i * slice;
        // 每齿四点：谷入(valleyR) → 齿顶起(outerR) → 齿顶止(outerR) → 谷出(valleyR)
        const fr = [0, 0.25, 0.5, 0.75];
        const radii = [valleyR, outerR, outerR, valleyR];
        for (let j = 0; j < 4; j += 1) {
          const angle = a + slice * fr[j];
          const x = Math.cos(angle) * radii[j];
          const y = Math.sin(angle) * radii[j];
          if (i === 0 && j === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }
      }
      context.closePath();

      // 中心孔：第二个子路径。配合 shape 的 fillRule:'evenodd'，孔区域被镂空。
      if (holeR > 0) {
        context.moveTo(holeR, 0);
        context.arc(0, 0, holeR, 0, Math.PI * 2);
      }

      // 关键：让 Konva 按 shape 的 fill / stroke / fillRule 上色。
      // 不调这一句，fill / stroke 都不会生效。
      context.fillStrokeShape(shape);
    },
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
    fillRule: 'evenodd',
  });
  layer.add(gear);

  let current: GearOptions = { teeth: 8, holeRatio: 0.3 };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    const cx = width / 2;
    const cy = height / 2;
    // 外径随画布缩放，保证齿轮始终居中且可见。
    const outerR = Math.min(width, height) * 0.36;
    const valleyR = outerR * VALLEY_RATIO;
    const holeR = current.holeRatio * outerR;

    // position 由 shape 承担；几何（齿数、半径）写入自定义属性，sceneFunc 读取。
    gear.position({ x: cx, y: cy });
    // 自定义几何属性不在 ShapeConfig 上，借 NodeConfig 的索引签名写入（sceneFunc 通过 getAttr 读取）。
    (gear as Konva.Node).setAttrs({
      teeth: current.teeth,
      outerRadius: outerR,
      valleyRadius: valleyR,
      holeRadius: holeR,
    });
    layer.batchDraw();

    emit({
      teeth: current.teeth,
      outerRadius: Math.round(outerR),
      valleyRadius: Math.round(valleyR),
      holeRadius: Math.round(holeR),
      vertexCount: current.teeth * 4,
      subpathCount: holeR > 0 ? 2 : 1,
    });
  }

  // 容器尺寸变化时重读宽高并重绘（外径依赖画布尺寸）。
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
