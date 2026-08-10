/**
 * 节点树结构范例。
 *
 * 演示内容：一棵以 Leafer 为根的场景树，内含两层 Group 容器与若干 Rect/Text 叶子，
 * 用 Controls 演示增删（增删整个子树）、层级排序（zIndex）和父子路径读取。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；Leafer 以 view 传入该 canvas 作为渲染画布。
 *
 * 主要操作：
 * - redZIndex：调整 boxA 内红色矩形的 zIndex，验证同级排序（zIndex 升序、相同则按添加顺序）。
 * - rightGroup：「保留 / 移除」切换右侧蓝色子树，验证 add/remove 与父子关系自动维护。
 * - selectNode：选择要读取路径的节点，验证 parent 链回溯与节点路径。
 *
 * 预期结果：调整 redZIndex 时红色矩形在 boxA 内前后切换并同步渲染序号；
 * 移除右侧组时总节点数与根直接子节点数下降；切换 selectNode 时读出对应 parent 链路径。
 *
 * 阅读主线：createNodeTree 建树 → update 应用输入并重算读数 → traversals 做树深度 / 路径 / 节点数统计。
 */
import {
  Leafer,
  Group,
  Box,
  Rect,
  Text,
  type IUI,
} from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface NodeTreeOptions {
  redZIndex: number;
  rightGroup: 'keep' | 'remove';
  selectNode: 'redRect' | 'rightGroup' | 'root';
}

export interface NodeTreeSnapshot {
  redZIndex: number;
  redRenderIndex: number;
  treeDepth: number;
  rootChildCount: number;
  totalNodes: number;
  selectedPath: string;
}

export interface NodeTreeInstance {
  update(options: NodeTreeOptions): void;
  dispose(): void;
}

// boxA 内三个同级矩形的基础 zIndex；只有红色由控件调整，其余固定为 0，
// 使 BranchHelper.sort 的比较全部落在数值区间（避免 undefined 参与比较产生 NaN）。
const SIBLING_BASE_Z = 0;

export function createNodeTree(
  canvas: HTMLCanvasElement,
  emit: (snapshot: NodeTreeSnapshot) => void,
): NodeTreeInstance {
  // Leafer 本身即场景树根（Tree / Layer），它继承自 Group，可直接持有 UI 子节点，
  // 同时拥有自己的 canvas、renderer 与 watcher，属性变更后自动重绘。
  const leafer = new Leafer({
    view: canvas,
    fill: '#ffffff',
  });

  // 右侧子树用 Group 包住 Box + 标签，便于整体增删演示父子的自动维护。
  // 每个节点的 tag 是只读的类名（Group / Box / Rect / Text），构造时无需也不能设置。
  const sideA = new Group();
  const sideB = new Group();
  const boxA = new Box();
  const boxB = new Box();
  const labelA = new Text();
  const labelB = new Text();

  const orange = new Rect({ fill: '#fb923c', zIndex: SIBLING_BASE_Z });
  const red = new Rect({ fill: '#ef4444' });
  const yellow = new Rect({ fill: '#facc15', zIndex: SIBLING_BASE_Z });
  const blue = new Rect({ fill: '#3b82f6' });
  const cyan = new Rect({ fill: '#06b6d4' });

  boxA.add([orange, red, yellow]);
  boxB.add([blue, cyan]);
  sideA.add([boxA, labelA]);
  sideB.add([boxB, labelB]);
  leafer.add([sideA, sideB]);

  let current: NodeTreeOptions = {
    redZIndex: 0,
    rightGroup: 'keep',
    selectNode: 'redRect',
  };

  // 依据画布尺寸重排布局：两组左右分列，boxA 内三块矩形相互重叠以便观察 zIndex 叠压。
  function layout() {
    const { width: W, height: H } = readCanvasSize(canvas);
    const safeW = Math.max(W, 320);
    const safeH = Math.max(H, 200);

    const boxW = Math.min(safeW * 0.34, 260);
    const boxH = Math.min(safeH * 0.62, 180);
    const aCx = safeW * 0.30;
    const bCx = safeW * 0.70;
    const cy = safeH * 0.54;

    layoutBox(boxA, boxW, boxH, aCx - boxW / 2, cy - boxH / 2, '#fef2f2', '#fecaca');
    layoutBox(boxB, boxW, boxH, bCx - boxW / 2, cy - boxH / 2, '#eff6ff', '#bfdbfe');

    // boxA 内三块重叠矩形：改变红色 zIndex 时会明显前后切换。
    const rw = boxW * 0.46;
    const rh = boxH * 0.46;
    orange.set({ x: boxW * 0.10, y: boxH * 0.12, width: rw, height: rh, cornerRadius: 8 });
    red.set({ x: boxW * 0.27, y: boxH * 0.26, width: rw, height: rh, cornerRadius: 8 });
    yellow.set({ x: boxW * 0.44, y: boxH * 0.40, width: rw, height: rh, cornerRadius: 8 });

    // boxB 内两块上下排列的矩形（不重叠），仅作为第二组结构的视觉参照。
    blue.set({
      x: boxW * 0.12,
      y: boxH * 0.12,
      width: boxW * 0.76,
      height: boxH * 0.32,
      cornerRadius: 8,
    });
    cyan.set({
      x: boxW * 0.12,
      y: boxH * 0.56,
      width: boxW * 0.76,
      height: boxH * 0.32,
      cornerRadius: 8,
    });

    labelA.set({
      text: 'Group · 红色组',
      x: boxA.x ?? 0,
      y: (boxA.y ?? 0) - 26,
      fontSize: 14,
      fontWeight: 600,
      fill: '#b91c1c',
    });
    labelB.set({
      text: 'Group · 蓝色组',
      x: boxB.x ?? 0,
      y: (boxB.y ?? 0) - 26,
      fontSize: 14,
      fontWeight: 600,
      fill: '#1d4ed8',
    });
  }

  function layoutBox(
    target: Box,
    w: number,
    h: number,
    x: number,
    y: number,
    fill: string,
    stroke: string,
  ) {
    target.set({
      x,
      y,
      width: w,
      height: h,
      fill,
      stroke,
      strokeWidth: 1.5,
      cornerRadius: 14,
      dashPattern: [6, 4],
    });
  }

  // —— 树形统计：仅按 children 可达性计算，避免依赖引擎维护计数 —— //

  function maxDepth(node: IUI): number {
    const kids = (node.children ?? []) as IUI[];
    if (kids.length === 0) return 1;
    return 1 + kids.reduce((m, c) => Math.max(m, maxDepth(c)), 0);
  }

  function countNodes(node: IUI): number {
    const kids = (node.children ?? []) as IUI[];
    return kids.reduce((n, c) => n + countNodes(c), 1);
  }

  function labelOf(node: IUI): string {
    if (node === leafer) return 'Leafer';
    return (node as IUI).tag;
  }

  function pathOf(node: IUI | null | undefined): string {
    if (!node) return '(已移除)';
    const parts: string[] = [];
    let cur: IUI | undefined = node;
    while (cur) {
      parts.unshift(labelOf(cur));
      cur = cur.parent as IUI | undefined;
    }
    return parts.join(' › ');
  }

  // 复刻 BranchHelper.sort 的规则：zIndex 升序，相同时按添加顺序，
  // 用于同步读出红色矩形在排序后的渲染序号（引擎会在下一次布局时落到同一顺序）。
  function redRenderIndexInBoxA(): number {
    const kids = (boxA.children ?? []) as IUI[];
    const ranked = kids
      .map((c, i) => ({ c, z: (c.zIndex as number) ?? 0, i }))
      .sort((a, b) => a.z - b.z || a.i - b.i);
    return ranked.findIndex((entry) => entry.c === red);
  }

  function selectedNode(): IUI | null {
    switch (current.selectNode) {
      case 'redRect':
        return red;
      case 'rightGroup':
        // 已从树中摘除时 parent 为空，视为不可达，让路径读数显示「(已移除)」。
        return sideB.parent ? sideB : null;
      case 'root':
        return leafer;
      default:
        return null;
    }
  }

  function sync() {
    // 增删：右侧子树按控件状态在根上挂载 / 卸载，父子引用由 add / remove 自动维护。
    if (current.rightGroup === 'remove' && sideB.parent) {
      sideB.remove(); // 无参 remove 等价于从父节点移除自身
    } else if (current.rightGroup === 'keep' && !sideB.parent) {
      leafer.add(sideB); // 重新挂载会自动从原父节点摘除（此处原为 null）
    }

    // 层级排序：仅设置 zIndex，引擎负责排序与重绘。
    red.zIndex = current.redZIndex;

    emit({
      redZIndex: current.redZIndex,
      redRenderIndex: redRenderIndexInBoxA(),
      treeDepth: maxDepth(leafer),
      rootChildCount: (leafer.children ?? []).length,
      totalNodes: countNodes(leafer),
      selectedPath: pathOf(selectedNode()),
    });
  }

  function refresh() {
    layout();
    sync();
  }

  const resizeObserver = createResizeObserver(canvas, refresh);

  return {
    update(options) {
      current = options;
      refresh();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
