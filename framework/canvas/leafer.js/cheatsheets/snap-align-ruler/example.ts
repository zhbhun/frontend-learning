/**
 * 演示内容：LeaferJS 2.2.9 编辑器「吸附」的内置做法——用 editor.config.beforeMove
 *           拦截每次移动（拖拽与方向键均走此路径），把落点吸附到自定义网格。
 *           并在正文说明：元素对齐线、标尺与参考线在 2.2.9 非内置，需社区/官方插件。
 *
 * 输入 / 前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *             必须引入 @leafer-in/editor（其模块导入会注册 Creator.editor 与 editor 插件）。
 *             本课公开输入：snap（吸附开关）、gridSize（网格大小 px）、showGrid（显示网格）。
 *
 * 主要操作：
 * - new App({ view: canvas, editor: {} }) 自动建立 tree（内容层）+ sky（变化层）+ editor；
 *   editor 落在 sky，可编辑元素加进 tree，两者处于不同 Leafer，点击 / 框选才能命中。
 * - 网格背景：一个 Path（SVG 路径串成的网格线），hittable: false 不参与命中、不挡选择；
 *   放在 tree 最底层，元素绘制在其之上。
 * - editor.config.beforeMove = ({ target, x, y }) => ...：x/y 是本次移动的本地增量，
 *   预测落点 target.x + x 后四舍五入到最近网格点，回传修正后的增量 { x, y } 完成吸附；
 *   关闭吸附时返回 undefined（void）原样放行。beforeMove 通过 mergeConfig 在每次 move 实时读取。
 *   方向键走 transformTool.move，同样经过 beforeMove，因此键盘微调也会被吸附。
 * - 监听 EditorEvent.SELECT / EditorMoveEvent.MOVE 同步 readout：
 *   「吸附」「网格」「选中位置」「吸附目标」（网格点坐标或「自由」）。
 *
 * 预期结果：拖动元素 → 元素在网格点上「跳跃」吸附（snap=是时），读数「选中位置 / 吸附目标」同步；
 *           方向键微调同样吸附；snap=否 → 元素自由跟随光标，吸附目标显示「自由」；
 *           调 gridSize → 网格疏密与吸附间隔同步变化；showGrid=否 → 网格线隐藏但吸附仍生效。
 *
 * 阅读主线：createSnapAlignRuler → App+editor 装配 → 网格背景 + editable 元素 →
 *           beforeMove 闭包读取 state 完成吸附 → update 改 state/网格 → 事件驱动 sync → dispose。
 */
import { App, Rect, Ellipse, Path } from 'leafer-ui';
import { Editor, EditorEvent, EditorMoveEvent } from '@leafer-in/editor';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface SnapAlignRulerOptions {
  snap: boolean;
  gridSize: number;
  showGrid: boolean;
}

export interface SnapAlignRulerSnapshot {
  /** 吸附是否开启（是 / 否）。 */
  snap: string;
  /** 当前网格大小（px）。 */
  gridSize: number;
  /** 选中元素的位置（x, y）；无选中时为「—」。 */
  selectedPos: string;
  /** 吸附目标：snap=是 时为最近网格点坐标，否则「自由」。 */
  snapTarget: string;
}

export interface SnapAlignRulerInstance {
  update(options: SnapAlignRulerOptions): void;
  dispose(): void;
}

/** 生成覆盖 (W × H) 的网格 SVG 路径串：每隔 g 像素一条竖线与横线。 */
function buildGridPath(W: number, H: number, g: number): string {
  const step = Math.max(2, g);
  let d = '';
  for (let x = 0; x <= W; x += step) d += `M ${x} 0 L ${x} ${H} `;
  for (let y = 0; y <= H; y += step) d += `M 0 ${y} L ${W} ${y} `;
  return d;
}

export function createSnapAlignRuler(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SnapAlignRulerSnapshot) => void,
): SnapAlignRulerInstance {
  const initial = readCanvasSize(canvas);

  // App 一行建立「内容层 + 变化层 + 编辑器」：editor: {} 触发 Creator.editor 自动创建并挂到 sky。
  const app = new App({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
    editor: {},
  });

  const tree = app.tree;
  const editor = app.editor as unknown as Editor;

  // 网格背景：Path 用 SVG 路径串成网格线，hittable: false 让它不参与命中、不挡选择，
  // 也不会被编辑器选中（Path 未标 editable）。先入 tree，确保绘制在元素之下。
  const grid = new Path({
    path: buildGridPath(initial.width, initial.height, 20),
    stroke: '#e6ebf3',
    strokeWidth: 1,
    hittable: false,
  });
  tree.add(grid);

  // 两个可编辑元素：editable: true 是被点击 / 框选取中的前提。
  const cx = initial.width / 2;
  const cy = initial.height / 2;
  const rect = new Rect({
    x: cx - 165,
    y: cy - 50,
    width: 120,
    height: 90,
    editable: true,
    fill: '#4f7cff',
    cornerRadius: 8,
  });
  const ellipse = new Ellipse({
    x: cx + 45,
    y: cy - 45,
    width: 100,
    height: 80,
    editable: true,
    fill: '#32cd79',
  });
  tree.add([rect, ellipse]);

  // beforeMove 闭包读取的运行时吸附状态：update() 改这里，无需重新赋值 editor.config.beforeMove。
  const state = { snap: true, gridSize: 20 };

  // editor.config.beforeMove 是 2.2.9 内置的「移动拦截」入口：
  // data.x / data.y 是本次移动的本地增量；返回 { x, y } 覆盖增量、返回 false 取消、返回 void 原样放行。
  // 拖拽与方向键（onArrow → transformTool.move）都经过这里，因此一处即可同时吸附鼠标与键盘。
  // target.x / target.y 在类型上是可选的（部分 UI 派生位置），运行时对本课元素恒为数字，用 ?? 0 兜底。
  editor.config.beforeMove = (data) => {
    if (!state.snap) return; // 关闭吸附：原样放行
    const g = Math.max(2, state.gridSize);
    const tx = data.target.x ?? 0;
    const ty = data.target.y ?? 0;
    // 预测落点（当前本地坐标 + 本次增量），吸附到最近网格点，再换算回「修正后的增量」。
    const snapX = Math.round((tx + data.x) / g) * g;
    const snapY = Math.round((ty + data.y) / g) * g;
    return { x: snapX - tx, y: snapY - ty };
  };

  let current: SnapAlignRulerOptions = { snap: true, gridSize: 20, showGrid: true };

  function sync() {
    const sel = editor.list[0];
    let selectedPos = '—';
    let snapTarget = '自由';
    if (sel) {
      const node = sel as unknown as { x: number; y: number };
      selectedPos = `${Math.round(node.x)}, ${Math.round(node.y)}`;
      if (current.snap) {
        const g = Math.max(2, current.gridSize);
        const gx = Math.round(node.x / g) * g;
        const gy = Math.round(node.y / g) * g;
        snapTarget = `网格点 ${gx}, ${gy}`;
      }
    }
    emit({
      snap: current.snap ? '是' : '否',
      gridSize: current.gridSize,
      selectedPos,
      snapTarget,
    });
  }

  function relayout() {
    const { width, height } = readCanvasSize(canvas);
    app.resize({ width, height });
    grid.set({ path: buildGridPath(width, height, current.gridSize) });
    grid.forceUpdate('surface');
    sync();
  }

  // 默认选中矩形，让吸附在拖动 / 键盘微调时立刻可观察。
  editor.select(rect);
  editor.on(EditorEvent.SELECT, sync);
  editor.on(EditorMoveEvent.MOVE, sync);

  // 首帧渲染、编辑框就绪后再派发一次兜底读数（SELECT 早于 editBox 加载）。
  app.nextRender(sync);

  const resizeObserver = createResizeObserver(canvas, relayout);

  return {
    update(options) {
      current = options;
      state.snap = options.snap;
      state.gridSize = options.gridSize;
      // 网格显隐与疏密同步：visible 控制渲染，path 重建改变网格间隔。
      grid.visible = options.showGrid;
      const { width, height } = readCanvasSize(canvas);
      grid.set({ path: buildGridPath(width, height, options.gridSize) });
      grid.forceUpdate('surface');
      sync();
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
