/**
 * 启用编辑器范例。
 *
 * 演示内容：用 App + editor 配置挂载编辑器，给场景中的 editable 元素挂上选中框，
 * 用 Controls 切换 editor.select() 的目标，观察选中框移动 / 消失与读数同步。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；App 以 view 传入该 canvas 作为渲染画布。
 * 必须引入 @leafer-in/editor（其模块导入会注册 Creator.editor 与 editor 插件）。
 *
 * 主要操作：
 * - selectTarget：切换 editor.select() 的目标（矩形 / 椭圆 / 文字 / 无选中）。
 *   选中「无选中」时调用 editor.cancel() 清空选中，选中框消失。
 *
 * 预期结果：切换 selectTarget 时，紫色选中框（#836DFF 描边 + 白色控制点）在三个元素间
 * 移动；选「无选中」时框消失。读数「编辑中 / 选中元素 / 选中数量」同步变化。
 * 此外编辑器默认开启悬停高亮、点击选中与框选——直接在画布上操作也能改变选中。
 *
 * 阅读主线：createEditorBasic 建场景 → update 应用 selectTarget → emit 同步读数；
 * EditorEvent.SELECT 监听用户在画布上的点击选中，使读数跟随交互更新。
 */
import { App, Rect, Ellipse, Text } from 'leafer-ui';
import { Editor, EditorEvent } from '@leafer-in/editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface EditorBasicsOptions {
  selectTarget: 'rect' | 'ellipse' | 'text' | 'none';
}

export interface EditorBasicsSnapshot {
  mounted: boolean;
  editing: boolean;
  selectedTag: string;
  selectedCount: number;
}

export interface EditorBasicsInstance {
  update(options: EditorBasicsOptions): void;
  dispose(): void;
}

export function createEditorBasic(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EditorBasicsSnapshot) => void,
): EditorBasicsInstance {
  // 启用编辑器：把 editor 配置传给 App，会自动创建 app.editor 实例、
  // tree 层（type 默认 'design'）与 sky 层，并把编辑器加到 sky 层。
  // 必须先 import '@leafer-in/editor'，否则 Creator.editor 未注册、app.editor 为空。
  const app = new App({
    view: canvas,
    fill: '#ffffff',
    editor: {},
  });

  // 场景元素加到 tree 层（内容层）。editable: true 是元素可被编辑器选中的前提：
  // 点击 / 框选命中时，选择器沿事件路径找第一个 editable 的元素作为目标。
  const rect = new Rect({
    editable: true,
    fill: '#ef4444',
    cornerRadius: 12,
  });
  const ellipse = new Ellipse({
    editable: true,
    fill: '#3b82f6',
  });
  const textNode = new Text({
    editable: true,
    text: '编辑器',
    fontSize: 30,
    fontWeight: 700,
    fill: '#1e293b',
  });

  app.tree.add([rect, ellipse, textNode]);

  // app.editor 由 App 自动创建并挂到 sky 层；这里取回实例用于编程式选中与读数。
  const editor = app.editor as unknown as Editor;

  let current: EditorBasicsOptions = { selectTarget: 'rect' };

  function layout() {
    // 按画布尺寸重排三个元素，给选中框足够的移动空间。
    const { width: W, height: H } = readCanvasSize(canvas);
    const safeW = Math.max(W, 320);
    const safeH = Math.max(H, 200);

    const size = Math.min(safeH * 0.42, 110);
    rect.set({
      x: safeW * 0.16,
      y: (safeH - size) / 2,
      width: size * 1.2,
      height: size,
    });
    ellipse.set({
      x: safeW * 0.5 - size / 2,
      y: (safeH - size) / 2,
      width: size,
      height: size,
    });
    textNode.set({
      x: safeW * 0.84 - 110,
      y: (safeH - 36) / 2,
    });
  }

  function targetOf(
    select: EditorBasicsOptions['selectTarget'],
  ): Rect | Ellipse | Text | null {
    switch (select) {
      case 'rect':
        return rect;
      case 'ellipse':
        return ellipse;
      case 'text':
        return textNode;
      default:
        return null;
    }
  }

  function sync() {
    const target = targetOf(current.selectTarget);
    if (target) {
      editor.select(target);
    } else {
      editor.cancel();
    }
    emit({
      mounted: !!app.editor,
      editing: editor.editing,
      selectedTag: editor.list[0]?.tag ?? '无',
      selectedCount: editor.list.length,
    });
  }

  // 用户在画布上点击 / 框选改变选中时，编辑器派发 EditorEvent.SELECT；
  // 监听它让读数跟随交互更新，而不只由 Controls 驱动。
  editor.on(EditorEvent.SELECT, () => {
    emit({
      mounted: !!app.editor,
      editing: editor.editing,
      selectedTag: editor.list[0]?.tag ?? '无',
      selectedCount: editor.list.length,
    });
  });

  function refresh() {
    layout();
    sync();
  }

  const resizeObserver = createResizeObserver(canvas, refresh);

  return {
    update(options) {
      current = options;
      sync();
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
