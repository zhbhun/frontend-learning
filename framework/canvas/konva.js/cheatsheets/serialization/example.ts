/**
 * 范例介绍：演示 Konva 序列化的完整往返——stage.toJSON() 把整棵节点树序列化成
 * JSON 字符串，Konva.Node.create(json, container) 再从字符串还原出等价节点树。
 *
 * 输入：shapeCount（源舞台中的圆数量）、view（显示源舞台还是从 JSON 还原的舞台）。
 * 主要操作：每次更新先重建源舞台 → stage.toJSON() 序列化 → 若 view='restored' 则
 *   销毁源舞台并用 Konva.Node.create(json, wrapper) 还原成显示舞台。
 * 预期结果：切换到「还原舞台」时画面与源舞台一致；读数显示 JSON 字符长度、顶层
 *   className、JSON 中的节点总数和首个圆的 fill，证明结构与属性完整往返。
 * 阅读主线：createSerialization 建立包裹层 → render 重建源舞台并序列化 →
 *   按 view 决定显示源舞台还是还原舞台 → report 解析 JSON 汇报读数。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface SerializationOptions {
  /** 源舞台中圆的数量。 */
  shapeCount: number;
  /** 显示模式：source 显示源舞台，restored 显示从 JSON 还原的舞台。 */
  view: 'source' | 'restored';
}

export interface SerializationSnapshot {
  /** toJSON() 产出的 JSON 字符串长度。 */
  jsonLength: number;
  /** 序列化对象的顶层 className（应为 'Stage'）。 */
  topClassName: string;
  /** JSON 中递归统计出的节点总数。 */
  restoredNodes: number;
  /** JSON 中首个圆的 fill 属性。 */
  firstFill: string;
}

export interface SerializationInstance {
  update(options: SerializationOptions): void;
  dispose(): void;
}

// 圆的配色，按顺序循环使用。
const PALETTE = ['#4f7cff', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

// toJSON() / toObject() 产出的节点结构。
type JsonNode = {
  attrs: Record<string, unknown>;
  className: string;
  children?: JsonNode[];
};

export function createSerialization(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SerializationSnapshot) => void,
): SerializationInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('找不到画布父容器。');
  }

  // canvasStory 已在 .cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会清空
  // container（_buildDOM 的 container.innerHTML = ''），因此用一个独立包裹层承接
  // 舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  // 当前显示的舞台（可能是源舞台，也可能是从 JSON 还原的舞台）。每次重建前先销毁旧的。
  let displayStage: Konva.Stage | null = null;
  let current: SerializationOptions = { shapeCount: 3, view: 'source' };

  // 构建源舞台：一个图层，内含标签 + 若干带 id 的可拖拽圆。
  function buildSourceStage(width: number, height: number): Konva.Stage {
    const stage = new Konva.Stage({ container: wrapper, width, height });
    const layer = new Konva.Layer();
    stage.add(layer);

    // 标签：text 是属性，会被序列化——还原后内容与源舞台一致。
    const label = new Konva.Text({
      text: `shapeCount = ${current.shapeCount}`,
      x: 16,
      y: 16,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fill: '#94a3b8',
      listening: false,
    });
    layer.add(label);

    const count = current.shapeCount;
    const span = Math.min(width, height) * 0.7;
    const radius =
      count > 0 ? Math.max(12, Math.min(34, span / (count * 2.4))) : 18;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const x = count === 1 ? width / 2 : width / 2 + (t - 0.5) * span;
      const circle = new Konva.Circle({
        id: `circle-${i}`,
        x,
        y: height / 2,
        radius,
        fill: PALETTE[i % PALETTE.length],
        stroke: '#ffffff',
        strokeWidth: 2,
        // draggable 是属性，会被序列化——还原后圆仍然可拖拽。
        draggable: true,
      });
      layer.add(circle);
    }

    return stage;
  }

  function destroyDisplay() {
    if (displayStage) {
      displayStage.destroy();
      displayStage = null;
    }
  }

  function render() {
    const { width, height } = readCanvasSize(canvas);
    destroyDisplay();

    // 1. 始终先构建源舞台，用来产生 JSON。
    const sourceStage = buildSourceStage(width, height);

    // 2. 序列化：toJSON() 返回 JSON 字符串（内部走 JSON.stringify(toObject())）。
    const json = sourceStage.toJSON();

    // 3. 按 view 决定显示源舞台，还是销毁源舞台后从 JSON 还原。
    if (current.view === 'restored') {
      sourceStage.destroy();
      // 第二个参数 container 仅对 Stage 还原有意义：注入到 attrs.container，
      // 因为 DOM 元素引用不会被序列化进 JSON。
      displayStage = Konva.Node.create(json, wrapper) as Konva.Stage;
    } else {
      displayStage = sourceStage;
    }

    // 显式请求一次重绘，确保还原舞台也会立即上屏。
    displayStage.batchDraw();

    report(json);
  }

  function report(json: string) {
    const obj = JSON.parse(json) as JsonNode;
    emit({
      jsonLength: json.length,
      topClassName: obj.className,
      restoredNodes: countNodes(obj),
      firstFill: String(findFirstCircle(obj)?.attrs?.fill ?? '—'),
    });
  }

  const resizeObserver = createResizeObserver(canvas, render);

  render();

  return {
    update(options) {
      current = options;
      render();
    },
    dispose() {
      destroyDisplay();
      resizeObserver.disconnect();
      wrapper.remove();
    },
  };
}

// 递归统计 JSON 对象中的节点总数（含自身），证明子节点被完整序列化。
function countNodes(node: JsonNode): number {
  let total = 1;
  if (node.children) {
    for (const child of node.children) {
      total += countNodes(child);
    }
  }
  return total;
}

// 在 JSON 对象中深度优先查找首个 className 为 'Circle' 的节点，用来核对属性。
function findFirstCircle(node: JsonNode): JsonNode | null {
  if (node.className === 'Circle') {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findFirstCircle(child);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
