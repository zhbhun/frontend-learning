/**
 * 范例介绍：演示 Konva 的核心架构——Stage > Layer > Group > Shape 节点树，
 * 以及「每个 Layer 对应一张真实 canvas」的分层机制。
 *
 * 输入 shapeCount：控制上层 Group 中圆的数量。
 * 主要操作：用 stage.add(layer) 搭建两层；底层放静态背景瓦片，上层用 Group
 *   装载可调数量的圆；改属性后由 Konva 默认的 autoDrawEnabled 自动重绘。
 * 预期结果：调整控件时圆数量变化，读数同步反映节点总数、图层数量、Group 子节点
 *   数与首个圆相对 Group 的坐标，证明树形结构与相对坐标系。
 * 阅读主线：createArchitecture 搭建舞台 → paintBackground 画静态底层 →
 *   rebuild 重建 Group 子节点 → report 汇报读数。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ArchitectureOptions {
  shapeCount: number;
}

export interface ArchitectureSnapshot {
  layerCount: number;
  totalNodes: number;
  groupChildren: number;
  firstCircle: string;
}

export interface ArchitectureInstance {
  update(options: ArchitectureOptions): void;
  dispose(): void;
}

// 圆的配色，按顺序循环使用。
const PALETTE = ['#4f7cff', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

export function createArchitecture(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ArchitectureSnapshot) => void,
): ArchitectureInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('找不到画布父容器。');
  }

  // canvasStory 已在 .cs-stage 内放好 canvas / 读数 / 说明。Konva.Stage 建立时会
  // 清空 container（见 _buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数和说明；默认 canvas 隐藏，改由 Konva 的图层 canvas
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

  // 底层：静态背景图层（标签 + 瓦片），不随 shapeCount 变化。
  const backgroundLayer = new Konva.Layer();
  stage.add(backgroundLayer);
  paintBackground(backgroundLayer, initial.width, initial.height);

  // 上层：动态形状图层（标签 + Group + 若干圆）。
  const shapesLayer = new Konva.Layer();
  stage.add(shapesLayer);

  const shapesLabel = new Konva.Text({
    text: '形状层（动态）',
    x: 16,
    y: 16,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#475569',
    listening: false,
  });
  shapesLayer.add(shapesLabel);

  // Group 不是 canvas，只是逻辑分组；子节点坐标相对 Group。
  const circleGroup = new Konva.Group({
    x: initial.width / 2,
    y: initial.height / 2,
  });
  shapesLayer.add(circleGroup);

  let current: ArchitectureOptions = { shapeCount: 3 };

  function rebuild() {
    // 销毁旧的圆并按当前数量重建。
    circleGroup.destroyChildren();
    const count = current.shapeCount;
    const span = Math.min(stage.width(), stage.height()) * 0.7;
    const radius =
      count > 0 ? Math.max(10, Math.min(34, span / (count * 2.4))) : 18;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const x = count === 1 ? 0 : (t - 0.5) * span;
      const circle = new Konva.Circle({
        x,
        y: 0,
        radius,
        fill: PALETTE[i % PALETTE.length],
        stroke: '#ffffff',
        strokeWidth: 2,
      });
      circleGroup.add(circle);
    }

    // Konva 默认 autoDrawEnabled = true，改属性会自动请求重绘；这里显式 batchDraw
    // 让重绘时机可观察，也方便把变更收拢到一帧。
    shapesLayer.batchDraw();
    report();
  }

  function report() {
    const groupChildren = circleGroup.getChildren().length;
    // 节点总数 = 1(stage) + 直接子图层 + 所有图层的后代。
    const total =
      1 +
      stage.getChildren().length +
      countDescendants(backgroundLayer) +
      countDescendants(shapesLayer);

    const first = circleGroup.findOne('Circle');
    const firstCircle = first
      ? `相对 Group (${Math.round(first.x())}, ${Math.round(first.y())})`
      : '—';

    emit({
      layerCount: stage.getChildren().length,
      totalNodes: total,
      groupChildren,
      firstCircle,
    });
  }

  // 尺寸变化时同步舞台大小：Stage 的 width/height 变更会触发内部 _resizeDOM 并重绘
  // 各图层，因此只需更新尺寸与依赖坐标的节点。
  const resizeObserver = createResizeObserver(canvas, () => {
    const next = readCanvasSize(canvas);
    stage.width(next.width);
    stage.height(next.height);
    paintBackground(backgroundLayer, next.width, next.height);
    backgroundLayer.batchDraw();
    circleGroup.position({ x: next.width / 2, y: next.height / 2 });
    rebuild();
  });

  rebuild();

  return {
    update(options) {
      current = options;
      rebuild();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}

// 绘制底层静态背景：标签 + 一圈淡色瓦片，提示画布范围与左上角原点。
function paintBackground(layer: Konva.Layer, width: number, height: number) {
  layer.destroyChildren();

  const label = new Konva.Text({
    text: '背景层（静态）',
    x: 16,
    y: 16,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#94a3b8',
    listening: false,
  });
  layer.add(label);

  const cols = 6;
  const rows = 3;
  const gap = 10;
  const tileW = Math.max(20, (width - gap * (cols + 1)) / cols);
  const tileH = Math.max(20, (height - gap * (rows + 1) - 48) / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const odd = (r + c) % 2 === 0;
      const tile = new Konva.Rect({
        x: gap + c * (tileW + gap),
        y: 48 + gap + r * (tileH + gap),
        width: tileW,
        height: tileH,
        fill: odd ? '#eef2f7' : '#e2e8f0',
        cornerRadius: 4,
      });
      layer.add(tile);
    }
  }
}

// 递归统计一个 Container 的全部后代节点数（不含自身）。
function countDescendants(container: Konva.Container): number {
  let total = 0;
  container.getChildren().forEach((child) => {
    total += 1;
    if (child instanceof Konva.Container) {
      total += countDescendants(child);
    }
  });
  return total;
}
