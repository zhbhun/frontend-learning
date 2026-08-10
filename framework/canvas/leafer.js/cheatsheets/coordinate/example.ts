/**
 * 演示内容：本地坐标（local）与世界坐标（world）的关系，以及两者的相互换算。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           本课公开输入：父 Group 的本地位移 parentX/parentY（即 group.x / group.y），
 *           与子节点的本地坐标 childX/childY（即子节点在父 Group 本地系中的 x / y）。
 * 主要操作：new Leafer({ view: canvas, width, height }) 按舞台尺寸建固定画布——世界原点固定在画布左上角；
 *           嵌套 Group(父) > Group(子节点包裹) > Rect + Text，给父级、子节点各设 x/y；
 *           update() 修改父级与子节点的 x/y，再调 leafer.updateLayout() 同步世界矩阵，
 *           然后用 getWorldPointByLocal（本地→世界）与 getLocalPoint（世界→本地）换算并派发读数。
 * 预期结果：拖动「父级位移」→ 整组在世界中平移，子节点本地坐标不变、世界坐标随之变化；
 *           拖动「子节点本地坐标」→ 仅子节点在父级内移动，本地与世界坐标都变；
 *           无缩放/旋转时 子节点世界坐标 ≈ 父级位移 + 子节点本地坐标。
 * 阅读主线：createCoordinateScene → 嵌套 Group/Rect → update 设值 + updateLayout → 双向换算 → dispose。
 */
import { Leafer, Group, Rect, Text, Line } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface CoordinateOptions {
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
}

export interface CoordinateSnapshot {
  /** 父 Group 的本地 x（在 Leafer 根的本地系中，根的本地系 == 世界系）。 */
  parentX: number;
  parentY: number;
  /** 子节点的本地坐标：相对父 Group 本地原点度量，父级移动时它不变。 */
  localX: number;
  localY: number;
  /** 子节点的世界坐标：getWorldPointByLocal(子节点本地坐标) 的换算结果。 */
  worldX: number;
  worldY: number;
  /** 世界原点 (0,0) 在子节点本地系中的位置：getLocalPoint(世界原点) 的换算结果，演示反向换算。 */
  originLocalX: number;
  originLocalY: number;
}

export interface CoordinateInstance {
  update(options: CoordinateOptions): void;
  dispose(): void;
}

const PANEL_W = 260;
const PANEL_H = 168;
const CHILD_SIZE = 66;

export function createCoordinateScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CoordinateSnapshot) => void,
): CoordinateInstance {
  // view 传 HTMLCanvasElement，并按舞台尺寸给出 width/height → 固定尺寸画布铺满舞台。
  // 此时 Leafer 根的本地坐标系 == 世界坐标系，原点在画布左上角，便于直观察看世界坐标。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // 世界原点标记：两条短线组成 L 形，从画布左上角指向画布内部，红色，强调「世界 (0,0) 固定在此」。
  leafer.add([
    new Line({ points: [0, 0, 22, 0], stroke: '#ef4444', strokeWidth: 2 }),
    new Line({ points: [0, 0, 0, 22], stroke: '#ef4444', strokeWidth: 2 }),
    new Text({
      text: '世界原点 (0, 0)',
      x: 28,
      y: 4,
      fontSize: 12,
      fill: '#ef4444',
    }),
  ]);

  // 父 Group：它的 x/y 就是它在世界中的位置（根的本地系 == 世界系）。
  // 父 Group 的本地原点 = 它自身被 x/y 定位的那个点；子节点以此为基准度量本地坐标。
  const parent = new Group({ x: 90, y: 70 });

  // 面板：可视化父 Group 的范围与本地原点。放在父 Group 内部的本地 (0,0)，
  // 所以面板左上角 == 父 Group 的本地原点 == 父级在世界中的位置。
  const panel = new Rect({
    x: 0,
    y: 0,
    width: PANEL_W,
    height: PANEL_H,
    fill: 'rgba(148, 163, 184, 0.12)',
    stroke: '#94a3b8',
    strokeWidth: 1.5,
    dashPattern: [6, 5],
    cornerRadius: 12,
  });
  const panelLabel = new Text({
    text: '父 Group（本地原点即它的 x/y）',
    x: 12,
    y: 10,
    fontSize: 12,
    fill: '#64748b',
  });
  parent.add([panel, panelLabel]);

  // 子节点：用一个 Group 包住 Rect + 标签，包裹层的 x/y 即子节点的本地坐标，
  // 调整它只移动子节点，不影响父级；父级移动时它作为子节点被一并带走。
  const childWrap = new Group({ x: 48, y: 38 });
  const childRect = new Rect({
    x: 0,
    y: 0,
    width: CHILD_SIZE,
    height: CHILD_SIZE,
    fill: '#4f7cff',
    cornerRadius: 12,
  });
  const childLabel = new Text({
    text: '子节点',
    x: CHILD_SIZE / 2,
    y: CHILD_SIZE + 6,
    fontSize: 12,
    fill: '#1e293b',
    textAlign: 'center',
  });
  childWrap.add([childRect, childLabel]);
  parent.add(childWrap);

  leafer.add(parent);

  let current: CoordinateOptions = {
    parentX: parent.x as number,
    parentY: parent.y as number,
    childX: childWrap.x as number,
    childY: childWrap.y as number,
  };

  function syncReadout() {
    // 设值后世界矩阵不会立即重算，updateLayout() 触发同步布局，保证换算读到最新坐标。
    leafer.updateLayout();

    // 本地 → 世界：把子节点的本地坐标点交给 getWorldPointByLocal，
    // 得到该点在世界系中的位置（≈ 父级位移 + 子节点本地坐标，无缩放/旋转时）。
    const world = childWrap.getWorldPointByLocal({
      x: current.childX,
      y: current.childY,
    });

    // 世界 → 本地：把世界原点交给 getLocalPoint，得到世界原点在子节点本地系中的位置，
    // 与上面的换算互为反向，数值上约为子节点本地坐标的相反数。
    const originLocal = childWrap.getLocalPoint({ x: 0, y: 0 });

    emit({
      parentX: Math.round(current.parentX),
      parentY: Math.round(current.parentY),
      localX: Math.round(current.childX),
      localY: Math.round(current.childY),
      worldX: Math.round(world.x),
      worldY: Math.round(world.y),
      originLocalX: Math.round(originLocal.x),
      originLocalY: Math.round(originLocal.y),
    });
  }

  // 首次读数：立即派发一次（best-effort），并在首轮渲染、世界矩阵就绪后再派发一次兜底。
  syncReadout();
  leafer.nextRender(syncReadout);

  // 舞台尺寸变化（如 Storybook 面板开合）时同步画布尺寸并刷新读数兜底显示。
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      // 父级的 x/y 改变 → 整组（含子节点）在世界中平移，子节点本地坐标不变。
      parent.x = options.parentX;
      parent.y = options.parentY;
      // 子节点的 x/y 改变 → 仅子节点在父 Group 的本地系中移动。
      childWrap.x = options.childX;
      childWrap.y = options.childY;
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
