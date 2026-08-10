/**
 * 框选、打组与解组范例。
 *
 * 演示内容：编辑器框选（boxSelect）多选 editable 元素，editor.group() 把多选并入一个
 * Group，editor.ungroup() 把组拆回独立元素；readout 读出组结构变化与元素父子关系。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；App 以 view 传入该 canvas 作为渲染画布。
 * 必须引入 @leafer-in/editor（其模块导入会注册 Creator.editor 与 editor 插件）。
 * 框选默认开启：boxSelect / multipleSelect 均为 true，在空白处拖拽即可框选 editable 元素。
 *
 * 主要操作（Controls 的 action）：
 * - 'boxSelect'：编程式选中全部元素，等价于框选覆盖整个区域的结果。若已打组，因组 hitChildren
 *   为 false，框选只能命中组本身，故选中那个 Group（与真实拖框行为一致）。
 * - 'group'：调用 editor.group()，把当前多选（≥2）并入一个 Group；要求 multiple 选中才执行。
 * - 'ungroup'：调用 editor.ungroup()，把选中的 Group 拆回独立元素。
 * - 'reset'：重置为 4 个独立元素并取消选中。
 *
 * 预期结果（读数证明正文结论）：
 * - boxSelect（散落）：选中数量 4 / 首个选中类型 Rect / tree 直接子节点 4 / 组内元素数 0。
 * - group：选中数量 1 / 首个选中类型 Group / tree 直接子节点 1 / 组内元素数 4。
 * - ungroup：选中数量 4 / 首个选中类型 Rect / tree 直接子节点 4 / 组内元素数 0。
 * 也可直接在画布空白处拖拽框选、点击单选，读数跟随 EditorEvent.SELECT 更新。
 *
 * 阅读主线：createGroupDemo 建场景 → update(action) 驱动框选/打组/解组 → emit 同步结构读数；
 * EditorEvent.SELECT / EditorGroupEvent 监听用户交互与打组解组，使读数跟随更新。
 */
import { App, Rect, Ellipse, Star, Polygon } from 'leafer-ui';
import { Editor, EditorEvent, EditorGroupEvent } from '@leafer-in/editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type GroupAction = 'boxSelect' | 'group' | 'ungroup' | 'reset';

export interface GroupOptions {
  action: GroupAction;
}

export interface GroupSnapshot {
  selectedCount: number;
  selectedTag: string;
  treeChildCount: number;
  groupChildCount: number;
}

export interface GroupInstance {
  update(options: GroupOptions): void;
  dispose(): void;
}

// 一个 Branch 节点（Group 是分支，但 Box/Frame 也是分支；这里只关心 tag === 'Group'）。
interface BranchLike {
  tag: string;
  children: { length: number };
  parent: unknown;
}

const PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

export function createGroupDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GroupSnapshot) => void,
): GroupInstance {
  // 启用编辑器：把 editor 配置传给 App，自动创建 app.editor、tree（design）与 sky 层。
  // boxSelect / multipleSelect 默认 true，空白处拖拽即可框选 editable 元素。
  const app = new App({
    view: canvas,
    fill: '#ffffff',
    editor: {},
  });

  const editor = app.editor as unknown as Editor;

  // 四个不同的 editable 元素散布在画布上，给框选留出明显的拖拽空间。
  // editable: true 是元素能被框选 / 点击命中的前提。
  const shapes: (Rect | Ellipse | Star | Polygon)[] = [];

  function buildShapes() {
    shapes.length = 0;
    shapes.push(new Rect({ editable: true, fill: PALETTE[0], cornerRadius: 12 }));
    shapes.push(new Ellipse({ editable: true, fill: PALETTE[1] }));
    shapes.push(new Star({ editable: true, fill: PALETTE[2], corners: 5 }));
    shapes.push(new Polygon({ editable: true, fill: PALETTE[3], sides: 6 }));
    app.tree.add(shapes);
  }

  buildShapes();

  function layout() {
    // 仅在「散落」状态（shape 都是 tree 直接子节点）下重排，避免改动组内子元素的本地坐标。
    if (!shapes.every((s) => s.parent === app.tree)) return;
    const { width: W, height: H } = readCanvasSize(canvas);
    const safeW = Math.max(W, 320);
    const safeH = Math.max(H, 200);
    const size = Math.min(safeH * 0.34, 78);
    const gap = size * 0.45;
    const total = size * 4 + gap * 3;
    const startX = (safeW - total) / 2;
    const y = (safeH - size) / 2;
    shapes.forEach((s, i) => {
      s.set({ x: startX + i * (size + gap), y, width: size, height: size });
    });
  }

  function findGroup(): BranchLike | null {
    // 在 tree 直接子节点里找打组产生的 Group。
    const found = app.tree.children.find((c) => (c as BranchLike).tag === 'Group');
    return (found as BranchLike) ?? null;
  }

  function emitSnapshot() {
    const group = findGroup();
    // 排除编辑器多选时插入 tree 的 SimulateElement（变换代理），只统计用户内容。
    const realChildren = app.tree.children.filter(
      (c) => (c as BranchLike).tag !== 'SimulateElement',
    );
    emit({
      selectedCount: editor.list.length,
      selectedTag: editor.list[0]?.tag ?? '无',
      treeChildCount: realChildren.length,
      groupChildCount: group ? group.children.length : 0,
    });
  }

  // 用户在画布上框选 / 点击改变选中时，编辑器派发 EditorEvent.SELECT，读数跟随更新。
  editor.on(EditorEvent.SELECT, emitSnapshot);
  // 打组 / 解组后 target 会变成新组或释放的子元素，同步读数。
  editor.on(EditorGroupEvent.GROUP, emitSnapshot);
  editor.on(EditorGroupEvent.UNGROUP, emitSnapshot);

  function applyAction(action: GroupAction) {
    switch (action) {
      case 'boxSelect': {
        // 编程式框选：散落时选中全部独立元素；已打组时只能选中组本身
        // （组 hitChildren 为 false，真实拖框也命中不到组内子元素）。
        if (shapes.every((s) => s.parent === app.tree)) {
          editor.select(shapes);
        } else {
          const g = findGroup();
          if (g) editor.select(g as unknown as Rect);
        }
        break;
      }
      case 'group': {
        // 打组要求 multiple 选中（≥2）；先确保散落 + 全选，再 group()。
        const g = findGroup();
        if (g) {
          editor.select(g as unknown as Rect); // 已有组：直接选中该组
        } else {
          editor.select(shapes);
          editor.group();
        }
        break;
      }
      case 'ungroup': {
        // 解组要求选中一个 Group；未打组时为空操作。
        const g = findGroup();
        if (g) {
          editor.select(g as unknown as Rect);
          editor.ungroup();
        }
        break;
      }
      case 'reset':
        // 回到散落状态：若已打组则解组，再取消选中。4 个元素始终保持不变。
        if (findGroup()) {
          editor.select(findGroup() as unknown as Rect);
          editor.ungroup();
        }
        editor.cancel();
        break;
    }
    emitSnapshot();
  }

  function refresh() {
    layout();
    emitSnapshot();
  }

  const resizeObserver = createResizeObserver(canvas, refresh);

  // 初始布局 + 模拟一次框选全部，让选中框出现、读数有初始值。
  layout();
  applyAction('boxSelect');

  return {
    update(options) {
      applyAction(options.action);
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
