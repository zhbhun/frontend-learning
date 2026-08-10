/**
 * 演示内容：Stage + Layer + Shape 的最小场景——一个矩形和一个圆。
 * 输入：圆形半径（circleRadius）、矩形圆角（rectCornerRadius）。
 * 主要操作：建 Stage → 建 Layer 加入 Stage → 建 Rect / Circle 加入 Layer；改属性即刷新。
 * 预期结果：页面出现一个蓝色圆角矩形和一个绿色圆；拖动控件时画面实时更新。
 *
 * canvasStory 的适配（关键）：
 * canvasStory 创建 div.cs-stage > canvas 并把 canvas 传给 create。Konva 的 Stage
 * 需要一个 DOM 容器，但建立时会清空 container，因此不能直接用 .cs-stage（会连带
 * 清掉读数）；改为在 .cs-stage 内挂一个空包裹层 wrapper 承接舞台：
 *   1. 隐藏 canvasStory 的空 canvas（Konva Stage 会自带渲染用的 canvas）；
 *   2. 用 readCanvasSize 取容器宽高建 Stage（container 指向 wrapper）；
 *   3. 尺寸变化时（createResizeObserver 回调）更新 Stage 宽高并重新布局；
 *   4. dispose 调 stage.destroy() + observer.disconnect() + wrapper.remove()。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface FirstSceneOptions {
  circleRadius: number;
  rectCornerRadius: number;
}

export interface FirstSceneSnapshot {
  stageSize: string;
  layerCount: number;
  childCount: number;
  circleRadius: number;
}

export interface FirstSceneInstance {
  update(options: FirstSceneOptions): void;
  dispose(): void;
}

export function createFirstScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FirstSceneSnapshot) => void,
): FirstSceneInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('canvas 必须有父节点才能作为 Konva Stage 的容器。');
  }
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);

  // 1. 舞台：绑定 DOM 容器，给定宽高。container 是唯一必填配置。
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });

  // 2. 图层：每个 Layer 对应一张可见 Canvas。
  const layer = new Konva.Layer();
  stage.add(layer);

  // 3. 形状：最小场景放一个矩形和一个圆。
  const rect = new Konva.Rect({
    width: 180,
    height: 110,
    fill: '#4f7cff',
    cornerRadius: 10,
    shadowBlur: 14,
    shadowColor: 'rgba(79, 124, 255, 0.35)',
    shadowOffsetY: 6,
  });
  layer.add(rect);

  const circle = new Konva.Circle({
    radius: 56,
    fill: '#22c55e',
    stroke: '#16a34a',
    strokeWidth: 3,
  });
  layer.add(circle);

  // 根据当前 Stage 尺寸把两个形状左右排开、整体居中。
  function layout() {
    const w = stage.width();
    const h = stage.height();
    rect.x(w / 2 - rect.width() / 2 - 60);
    rect.y(h / 2 - rect.height() / 2);
    circle.x(w / 2 + 70);
    circle.y(h / 2);
  }

  function emitSnapshot() {
    emit({
      stageSize: `${Math.round(stage.width())} × ${Math.round(stage.height())}`,
      layerCount: stage.getLayers().length,
      childCount: layer.getChildren().length,
      circleRadius: circle.radius(),
    });
  }

  layout();
  emitSnapshot();

  // 尺寸适配：容器变化时同步 Stage 宽高并重新布局。
  // 设 width / height 和形状位置都会触发 Konva auto-draw，无需手动 batchDraw。
  const resizeObserver = createResizeObserver(canvas, () => {
    const next = readCanvasSize(canvas);
    stage.width(next.width);
    stage.height(next.height);
    layout();
    emitSnapshot();
  });

  return {
    update(options) {
      // 改属性即刷新：Konva auto-draw 会自动调度 batchDraw。
      circle.radius(options.circleRadius);
      rect.cornerRadius(options.rectCornerRadius);
      emitSnapshot();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
