/**
 * 范例介绍：演示 Konva.Transformer 如何附加到节点，并提供可视化的缩放与旋转。
 * 核心观察——Transformer 拖动锚点时改写的是节点的 scaleX / scaleY（缩放）
 *   和 rotation（旋转），而不是 width / height。因此「基础尺寸」始终不变，
 *   变化的是 scale；「有效尺寸」= 基础尺寸 × scale。
 *
 * 输入（Controls 配置变换器外观与行为）：
 *   rotateEnabled / keepRatio / centeredScaling / anchorSize / padding / anchorSet。
 * 操作（直接在 Canvas 上拖拽）：
 *   拖动 8 个缩放锚点（角点 / 边中点）改变 scaleX / scaleY；
 *   拖动顶部圆点（旋转手柄）改变 rotation。
 * 预期：
 *   切换「锚点集合」看到锚点显隐；keepRatio 时拖角点保持宽高比；
 *   读数显示 scaleX / scaleY / rotation 同步变化，基础宽高恒定、有效宽高随之缩放。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 锚点集合预设：对应当前启用的 enabledAnchors。 */
export type AnchorSet = 'all' | 'corners' | 'edges' | 'none';

export interface TransformerOptions {
  /** rotateEnabled：是否显示旋转手柄并允许旋转。 */
  rotateEnabled: boolean;
  /** keepRatio：拖动角点时是否保持宽高比。 */
  keepRatio: boolean;
  /** centeredScaling：是否相对节点中心缩放（而非对边）。 */
  centeredScaling: boolean;
  /** anchorSize：缩放锚点的边长。 */
  anchorSize: number;
  /** padding：变换器边框与节点之间的间距。 */
  padding: number;
  /** enabledAnchors：控制显示哪些缩放锚点。 */
  anchorSet: AnchorSet;
}

export interface TransformerSnapshot {
  scaleX: number;
  scaleY: number;
  rotation: number;
  baseWidth: number;
  baseHeight: number;
  effectiveWidth: number;
  effectiveHeight: number;
}

export interface TransformerInstance {
  update(options: TransformerOptions): void;
  dispose(): void;
}

// 八个缩放锚点的完整名单（与 Konva 内置 ANCHORS_NAMES 一致）。
const ANCHOR_SETS: Record<AnchorSet, string[]> = {
  all: [
    'top-left',
    'top-center',
    'top-right',
    'middle-right',
    'middle-left',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ],
  corners: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  edges: ['top-center', 'middle-right', 'middle-left', 'bottom-center'],
  none: [],
};

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function createTransformerDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransformerSnapshot) => void,
): TransformerInstance {
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

  // 被变换的矩形：居中放置。Transformer 只改 scale / rotation，不改 width / height，
  // 因此基础宽高固定，读数用它们推算「有效尺寸」。
  const baseWidth = 150;
  const baseHeight = 100;
  const rect = new Konva.Rect({
    x: Math.round((initial.width - baseWidth) / 2),
    y: Math.round((initial.height - baseHeight) / 2),
    width: baseWidth,
    height: baseHeight,
    fill: '#4f7cff',
    stroke: '#1e293b',
    strokeWidth: 2,
  });
  layer.add(rect);

  // 变换器：构造时通过 nodes 附加到矩形，画出边框 + 缩放锚点 + 旋转手柄。
  // 颜色沿用 Konva 默认（anchorStroke / borderStroke 为 rgb(0,161,255)），这里显式写出便于阅读。
  const transformer = new Konva.Transformer({
    nodes: [rect],
    rotateEnabled: true,
    keepRatio: true,
    centeredScaling: false,
    anchorSize: 10,
    padding: 0,
    borderStroke: 'rgb(0, 161, 255)',
    borderStrokeWidth: 1,
    borderDash: [],
    anchorFill: 'white',
    anchorStroke: 'rgb(0, 161, 255)',
    anchorStrokeWidth: 1,
    anchorCornerRadius: 0,
  });
  layer.add(transformer);

  let current: TransformerOptions = {
    rotateEnabled: true,
    keepRatio: true,
    centeredScaling: false,
    anchorSize: 10,
    padding: 0,
    anchorSet: 'all',
  };

  // 读取节点的实时变换状态并派生「有效尺寸」。
  function syncReadout() {
    const scaleX = rect.scaleX();
    const scaleY = rect.scaleY();
    emit({
      scaleX: round(scaleX),
      scaleY: round(scaleY),
      rotation: round(rect.rotation()),
      baseWidth,
      baseHeight,
      effectiveWidth: Math.round(baseWidth * scaleX),
      effectiveHeight: Math.round(baseHeight * scaleY),
    });
  }

  // transform 事件由 Transformer 触发并冒泡到被变换的节点：拖锚点 / 旋转手柄时持续派发。
  rect.on('transformstart', syncReadout);
  rect.on('transform', syncReadout);
  rect.on('transformend', syncReadout);

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);
    layer.batchDraw();
    syncReadout();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      transformer.rotateEnabled(options.rotateEnabled);
      transformer.keepRatio(options.keepRatio);
      transformer.centeredScaling(options.centeredScaling);
      transformer.anchorSize(options.anchorSize);
      transformer.padding(options.padding);
      transformer.enabledAnchors(ANCHOR_SETS[options.anchorSet]);
      // 切换锚点 / 旋转开关后，需要重算变换器包围盒并重绘。
      transformer.forceUpdate();
      layer.batchDraw();
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
