/**
 * 内部编辑器与编辑工具范例。
 *
 * 演示内容：自定义 EditTool（编辑工具）的注册与使用——注册一个 GridSnapEditTool，
 * 它覆盖 onMove（拖动元素本体时触发），把元素位置吸附到网格交点。
 * 场景里有一个可编辑的 Rect，画布上绘有与吸附步长一致的网格背景。
 * 切换「编辑工具」可在默认 EditTool（自由移动）与 GridSnapEditTool（网格吸附）间热切换；
 * readout 读出当前 editTool.tag、自定义工具是否已注册、吸附步长与矩形位置。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；App 以 view 传入该 canvas。
 * 必须引入 @leafer-in/editor（注册 Editor、EditTool 基类、LineEditTool 等）。
 *
 * 主要操作：
 * - editTool：'default' 时把 rect.editOuter 写为 'EditTool'（基类，标准变换）；
 *   'gridSnap' 时写为 'GridSnapEditTool'，再 editor.updateEditTool() 重新加载工具。
 *   editOuter 是元素属性，写实例值会覆盖其计算默认值；选中状态保持，工具热切换。
 * - snapStep：写入 GridSnapEditTool 实例的 snapStep，并重绘网格 path。
 *
 * 预期结果：编辑工具 = gridSnap 时，拖动矩形本体（onMove 触发）会让矩形吸附到最近网格交点，
 * 肉眼看矩形“跳”在网格线上；= default 时矩形随手自由移动、不停在网格上。
 * readout「编辑工具」在 'EditTool' / 'GridSnapEditTool' 间切换，注册表读数始终为「是」。
 *
 * 阅读主线：模块级注册 GridSnapEditTool → createInnerEditorDemo 建场景（网格 + 可编辑矩形 + 选中）
 *   → update 应用 editTool / snapStep → emit 同步读数；EditorMoveEvent.MOVE 监听拖动，实时回传位置。
 */
import { App, Rect, Path } from 'leafer-ui';
import {
  Editor,
  EditTool,
  EditToolCreator,
  EditorMoveEvent,
} from '@leafer-in/editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 自定义编辑工具：继承 EditTool，覆盖 onMove，在拖动元素本体时把位置吸附到网格。
//
// 注册机制（与 InnerEditor 共用同一个注册表 EditToolCreator.list）：
// 调用继承自 EditTool 的静态方法 registerEditTool()，按类上的 tag getter 存入 list。
// 这一步在模块加载时执行，不依赖装饰器 / tsconfig，JS 环境同样可用。
// EditTool 与 InnerEditor 的注册函数本是同一个，只是子类化方向与生命周期不同。
class GridSnapEditTool extends EditTool {
  /** 注册键：updateEditTool 用 target.editOuter 的值在 list 里查这个 tag。 */
  get tag(): string {
    return 'GridSnapEditTool';
  }

  /** 吸附步长（px）；由 Controls 写入实例。<=0 时退回基类的自由移动。 */
  public snapStep = 20;

  // onMove 只在「拖动元素本体」时触发（拖缩放手柄走 onScale、旋转走 onRotate）。
  // 覆盖它：先按原始世界增量移动，再把元素的本地坐标吸附到步长整数倍。
  // 本例元素是 app.tree 的直接子节点、tree 层无缩放旋转，本地坐标 ≡ 世界坐标，
  // 故吸附 target.x / target.y 即等价于把世界落点对齐到网格交点。
  onMove(e: EditorMoveEvent): void {
    const step = this.snapStep;
    const editor = e.editor as unknown as Editor;
    if (!editor || step <= 0) {
      super.onMove(e);
      return;
    }
    const { moveX, moveY } = e;
    const { app, list } = editor;
    app.lockLayout();
    list.forEach((target) => {
      target.moveWorld(moveX, moveY);
      target.x = Math.round((target.x ?? 0) / step) * step;
      target.y = Math.round((target.y ?? 0) / step) * step;
    });
    app.unlockLayout();
  }
}
// 静态方法注册：等价于官方的 @registerEditTool() 装饰器，无需改 tsconfig。
GridSnapEditTool.registerEditTool();

export type EditToolChoice = 'default' | 'gridSnap';

export interface InnerEditorOptions {
  editTool: EditToolChoice;
  snapStep: number;
}

export interface InnerEditorSnapshot {
  editToolTag: string;
  customRegistered: boolean;
  snapStep: number;
  rectX: number;
  rectY: number;
}

export interface InnerEditorInstance {
  update(options: InnerEditorOptions): void;
  dispose(): void;
}

/** 生成覆盖画布的网格 SVG path 数据：每隔 step 一条竖线 + 横线。 */
function buildGridPath(width: number, height: number, step: number): string {
  const safeStep = Math.max(1, step);
  let d = '';
  for (let x = 0; x <= width; x += safeStep) d += `M ${x} 0 L ${x} ${height} `;
  for (let y = 0; y <= height; y += safeStep) d += `M 0 ${y} L ${width} ${y} `;
  return d;
}

export function createInnerEditorDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InnerEditorSnapshot) => void,
): InnerEditorInstance {
  const initial = readCanvasSize(canvas);
  const startW = Math.max(initial.width, 320);
  const startH = Math.max(initial.height, 200);

  // 启用编辑器：editor: {} 自动建立 tree（design）+ sky + app.editor。
  const app = new App({
    view: canvas,
    width: startW,
    height: startH,
    fill: '#ffffff',
    editor: {},
  });

  const tree = app.tree;
  const editor = app.editor as unknown as Editor;

  // 网格背景：非 editable，编辑器的选择器只命中 editable 元素，不会选到网格。
  // 放在 Rect 之前（更低的图层），让吸附效果可见。
  const grid = new Path({
    path: buildGridPath(startW, startH, 20),
    stroke: '#e6ecf6',
    strokeWidth: 1,
  });
  tree.add(grid);

  // 唯一的可编辑元素：editable: true 是被点击 / 框选取中的前提。
  const rect = new Rect({
    x: 20,
    y: 20,
    width: 90,
    height: 70,
    editable: true,
    fill: '#4f7cff',
    cornerRadius: 10,
  });
  tree.add(rect);

  let current: InnerEditorOptions = { editTool: 'gridSnap', snapStep: 20 };

  function snapshot(): void {
    emit({
      editToolTag: editor.editTool?.tag ?? '—',
      customRegistered: !!EditToolCreator.list['GridSnapEditTool'],
      snapStep: current.snapStep,
      rectX: rect.x ?? 0,
      rectY: rect.y ?? 0,
    });
  }

  // 用户拖动元素本体时实时回传位置（gridSnap 下会看到吸附后的整数倍坐标）。
  editor.on(EditorMoveEvent.MOVE, snapshot);

  function applyOptions(options: InnerEditorOptions): void {
    current = options;

    // 步长变化时重绘网格，使网格密度与吸附步长一致。
    const { width: W, height: H } = readCanvasSize(canvas);
    grid.path = buildGridPath(Math.max(W, 320), Math.max(H, 200), options.snapStep);

    // 写元素的 editOuter 属性：实例值覆盖计算默认值，决定 updateEditTool 用哪个工具。
    // 'default' 显式写 'EditTool'（基类标准变换），'gridSnap' 写自定义 tag。
    rect.editOuter = options.editTool === 'gridSnap' ? 'GridSnapEditTool' : 'EditTool';
    editor.updateEditTool();

    // 工具实例缓存在 editToolList，getEditTool 取回后写入吸附步长。
    if (options.editTool === 'gridSnap') {
      const tool = editor.getEditTool('GridSnapEditTool') as unknown as GridSnapEditTool;
      if (tool) tool.snapStep = options.snapStep;
    }

    snapshot();
  }

  // 选中矩形，让 editTool 激活（updateEditTool 只在 editing 时加载工具）。
  editor.select(rect);
  applyOptions(current);

  // 舞台尺寸变化时同步画布与网格。
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    app.resize({ width, height });
    grid.path = buildGridPath(width, height, current.snapStep);
    snapshot();
  });

  return {
    update(options) {
      applyOptions(options);
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
