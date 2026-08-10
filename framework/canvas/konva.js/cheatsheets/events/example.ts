/**
 * 范例介绍：演示 Konva 事件系统的核心机制——事件对象（target / currentTarget）、
 * 沿节点树冒泡（Shape → Group → Layer → Stage），以及 cancelBubble 与 listening
 * 两个开关如何改变事件的传播范围。
 *
 * 场景结构（左侧 Group 嵌套 Circle，右侧 Rect 直接挂 Layer）：
 *   Stage
 *     Layer
 *       GroupGuide（虚线框，装饰，listening=false）
 *       Group
 *         Circle            ← 点击触发 4 级冒泡：Circle → Group → Layer → Stage
 *       Rect               ← 点击触发 3 级冒泡：Rect → Layer → Stage
 *       Marker（命中标记，listening=false） / Info（文字，listening=false）
 *
 * 输入：cancelBubble（目标形状是否取消冒泡）、circleListening（Circle 是否参与命中检测）。
 * 操作：点击 Circle / Rect / 空白处，观察冒泡路径。
 * 预期：cancelBubble=true 时只目标触发；circleListening=false 时点击 Circle 区域穿透到 Stage。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface EventsOptions {
  /** 目标形状是否在处理器里设置 evt.cancelBubble = true 阻止冒泡。 */
  cancelBubble: boolean;
  /** Circle 是否参与命中检测：false 时点击 Circle 区域会穿透到 Stage。 */
  circleListening: boolean;
}

export interface EventsSnapshot {
  /** evt.target.getClassName()：实际命中的节点类型，冒泡过程中保持不变。 */
  target: string;
  /** currentTarget 序列：从目标到 Stage 依次触发的处理器节点。 */
  chain: string[];
  /** 实际触发的处理器数量。 */
  count: number;
}

export interface EventsInstance {
  update(options: EventsOptions): void;
  dispose(): void;
}

// 视觉常量。
const FILL = '#4f7cff';
const STROKE = '#1e293b';
const STROKE_WIDTH = 2;
const GUIDE = '#94a3b8';
const BACKDROP = '#f1f5f9';
const MARKER = '#f59e0b';
const TEXT = '#475569';

export function createEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventsSnapshot) => void,
): EventsInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const root = canvas.parentElement;
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

  // 背景矩形：满铺舞台，给空白区域一个底色，便于读者区分「点中形状」与「点空白」。
  const backdrop = new Konva.Rect({
    fill: BACKDROP,
    listening: false,
  });
  layer.add(backdrop);

  // 左侧虚线框：标注 Group 的范围（装饰，不参与命中）。
  const groupGuide = new Konva.Rect({
    stroke: GUIDE,
    strokeWidth: 1,
    dash: [6, 4],
    listening: false,
  });
  layer.add(groupGuide);

  // Group + 内嵌 Circle：演示 Group 层级的冒泡。
  const group = new Konva.Group();
  layer.add(group);
  const circle = new Konva.Circle({
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  group.add(circle);

  // 右侧 Rect：直接挂在 Layer 上，作为另一个可点击目标。
  const rect = new Konva.Rect({
    fill: FILL,
    stroke: STROKE,
    strokeWidth: STROKE_WIDTH,
  });
  layer.add(rect);

  // 命中标记：一个小圆环，落在最近一次点击的位置（装饰，不参与命中）。
  const marker = new Konva.Circle({
    radius: 14,
    stroke: MARKER,
    strokeWidth: 3,
    visible: false,
    listening: false,
  });
  layer.add(marker);

  // 信息文字：在画布底部显示最近一次的冒泡路径。
  const info = new Konva.Text({
    fill: TEXT,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    listening: false,
  });
  layer.add(info);

  let current: EventsOptions = {
    cancelBubble: false,
    circleListening: true,
  };

  // —— 冒泡路径累积：Konva 的冒泡是同步的，用 microtask 在全部处理器跑完后一次性输出 ——
  let chain: string[] = [];
  let targetName = '';
  let lastPointer: Konva.Vector2d | null = null;
  let emitQueued = false;

  function flush() {
    emitQueued = false;
    const snapshot: EventsSnapshot = {
      target: targetName,
      chain: [...chain],
      count: chain.length,
    };

    // 更新信息文字与命中标记。
    if (targetName) {
      info.text(
        `click  target=${targetName}  path=${chain.join(' → ') || '（无）'}`,
      );
      if (lastPointer) {
        marker.position(lastPointer);
        marker.visible(true);
      }
    }

    chain = [];
    targetName = '';
    emit(snapshot);
    layer.batchDraw();
  }

  function scheduleEmit() {
    if (emitQueued) {
      return;
    }
    emitQueued = true;
    // queueMicrotask 在当前同步冒泡链全部跑完后触发，确保读到完整路径。
    queueMicrotask(flush);
  }

  // 绑定 click：label 是该节点在 currentTarget 序列里的显示名。
  // evt 的类型由 on() 的重载推断为 KonvaEventObject<MouseEvent>，无需手写。
  function bindClick(node: Konva.Node, label: string) {
    node.on('click', (evt) => {
      // evt.target 在整个冒泡过程中不变（始终是实际命中的形状）；
      // 只在目标处理器（evt.target === 当前节点）上捕获 target 名与指针位置，
      // 并按选项设置 cancelBubble。
      if (evt.target === node) {
        targetName = node.getClassName();
        const pos = stage.getPointerPosition();
        if (pos) {
          lastPointer = pos;
        }
        if (current.cancelBubble) {
          evt.cancelBubble = true;
        }
      }
      chain.push(label);
      scheduleEmit();
    });
  }

  // 四级监听：Circle → Group → Layer → Stage；外加 Rect（挂在 Layer 上）。
  bindClick(circle, 'Circle');
  bindClick(group, 'Group');
  bindClick(layer, 'Layer');
  bindClick(stage, 'Stage');
  bindClick(rect, 'Rect');

  function layout() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    backdrop.setAttrs({ x: 0, y: 0, width, height });

    const pad = 32;
    const half = width / 2;

    // 左侧 Group 区域。
    const guideX = pad;
    const guideY = pad;
    const guideW = Math.max(60, half - pad - pad / 2);
    const guideH = Math.max(60, height - pad * 2 - 28);
    groupGuide.setAttrs({
      x: guideX,
      y: guideY,
      width: guideW,
      height: guideH,
    });

    // Circle 居中在 Group 区域内。
    const circleR = Math.max(20, Math.min(guideW, guideH) * 0.3);
    circle.setAttrs({
      x: guideX + guideW / 2,
      y: guideY + guideH / 2,
      radius: circleR,
    });

    // 右侧 Rect。
    const rectX = half + pad / 2;
    const rectW = Math.max(60, width - rectX - pad);
    rect.setAttrs({ x: rectX, y: pad, width: rectW, height: guideH });

    info.setAttrs({ x: pad, y: height - 24, width: width - pad * 2 });
  }

  layout();
  layer.batchDraw();

  const resizeObserver = createResizeObserver(canvas, () => {
    layout();
    layer.batchDraw();
  });

  return {
    update(options) {
      current = options;
      // listening 是 Konva.Node 的 get/set 访问器；改为 false 后命中检测会跳过该节点，
      // 并连同子节点一起从命中图移除。
      circle.listening(options.circleListening);
      layout();
      layer.batchDraw();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
