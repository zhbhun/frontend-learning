/**
 * 演示内容：Box 容器 + @leafer-in/flow 的 Flex 自动布局。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           顶部 import '@leafer-in/flow' 是副作用导入——它注册 flow/gap/flowAlign/flowWrap/
 *           autoWidth/autoHeight 等属性，并给 Box 装上自动布局能力；不引入则 Box 无 flex 行为。
 *           本课公开输入：flow（主轴方向）、gap（间距）、flowAlign（对齐）、flowWrap（换行）、
 *           growLast（末项主轴弹性权重，即 flexGrow）、childCount（子项数量）。
 * 主要操作：new Leafer({ view: canvas, width, height }) 按舞台建固定画布；
 *           建一个 Box 容器（显式 flow + 固定 width/height + padding），放入若干固定尺寸 Rect；
 *           update 按 args 设 box 的 flow/gap/flowAlign/flowWrap、增删子项、给末项设 autoWidth/autoHeight 弹性权重；
 *           设值后 leafer.updateLayout() 强制同步布局，再用 getBounds('box', box) 测量子项在容器内的坐标，
 *           派生排列方向 / 首项坐标 / 项间间距 / 末项主轴尺寸 / 排列行数。
 * 预期结果：切换 flow → 子项改沿横向/纵向排列、反向排列；调 gap → 项间间距读数同步；
 *           切 flowAlign → 首项坐标与整组位置变化；开 flowWrap + 增子项 → 排列行数增加；
 *           growLast>0 → 末项主轴尺寸变大（吃掉剩余空间）。
 * 阅读主线：createLayout → 建容器与子项 → update 重设容器属性与末项权重 → updateLayout → 测量派生读数 → dispose。
 */
import '@leafer-in/flow'; // 副作用：注册 flow 相关属性并给 Box 装上自动布局
import { Leafer, Box, Rect } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FlowOption = 'x' | 'y' | 'x-reverse' | 'y-reverse';

export type FlowAlignOption =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

export interface LayoutOptions {
  flow: FlowOption;
  gap: number;
  flowAlign: FlowAlignOption;
  flowWrap: boolean;
  growLast: number;
  childCount: number;
}

export interface LayoutSnapshot {
  /** 当前排列方向（回读 box.flow，证明属性已生效）。 */
  flow: string;
  /** 第一个子项在容器内的本地坐标：随 flow 方向与 flowAlign 改变。 */
  firstX: number;
  firstY: number;
  /** 首项所在行/列内相邻两项的实测间距（px）；不足两项时为 null。 */
  gapMeasured: number | null;
  /** 末项沿主轴的尺寸（px）：growLast>0 时变大，证明弹性权重吃掉剩余空间。 */
  lastMainSize: number;
  /** 排列行/列数：flowWrap 开启且放不下时增加。 */
  lines: number;
}

export interface LayoutInstance {
  update(options: LayoutOptions): void;
  dispose(): void;
}

const CHILD_SIZE = 60;
const CHILD_COLORS = [
  '#4f7cff',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#14b8a6',
];

function isMainX(flow: FlowOption): boolean {
  return flow === 'x' || flow === 'x-reverse';
}

export function createLayout(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LayoutSnapshot) => void,
): LayoutInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // 容器：Box 显式声明 flow，并给固定 width/height + padding。
  // 固定尺寸是 flex 行为可预测的前提——无宽高的 Box 会被当作按内容自适应的普通 Group。
  const box = new Box({
    flow: 'x',
    gap: 8,
    flowAlign: 'top-left',
    flowWrap: false,
    cornerRadius: 10,
    fill: '#f1f5f9',
    stroke: '#cbd5f0',
    strokeWidth: 1,
    padding: 12,
  });
  leafer.add(box);

  const children: Rect[] = [];

  function fitContainer() {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    // 容器取一个受舞台约束、又能让换行可观察的尺寸。
    const boxWidth = Math.max(220, Math.min(width - 48, 360));
    const boxHeight = Math.max(150, Math.min(height - 32, 270));
    box.width = boxWidth;
    box.height = boxHeight;
    box.x = Math.round((width - boxWidth) / 2);
    box.y = Math.round((height - boxHeight) / 2);
  }

  function applyToBox(options: LayoutOptions) {
    box.flow = options.flow;
    box.gap = options.gap;
    // flowAlign 同时支持方向字符串与 {content,x,y} 对象，这里用字符串形式。
    box.flowAlign = options.flowAlign;
    box.flowWrap = options.flowWrap;

    // 每次全量重建子项。autoWidth/autoHeight 的 grow 通过 scaleResize 放大子项实现，
    // 一旦放大，去掉权重后缩放不会自动还原、且后续布局会在已放大的尺寸上继续叠加。
    // 重建保证子项始终从原始尺寸参与布局，growLast / gap / flow 反复切换结果稳定可控。
    children.forEach((child) => box.remove(child));
    children.length = 0;

    // 仅末项按 growLast 沿主轴分配剩余空间。
    // flow-x：autoWidth 为主轴 grow（横向拉伸）；flow-y：autoHeight 为主轴 grow（纵向拉伸）。
    const mainX = isMainX(options.flow);
    for (let index = 0; index < options.childCount; index++) {
      const isLast = index === options.childCount - 1;
      const grow = isLast && options.growLast > 0 ? options.growLast : 0;
      const data: Record<string, unknown> = {
        width: CHILD_SIZE,
        height: CHILD_SIZE,
        fill: CHILD_COLORS[index % CHILD_COLORS.length],
        cornerRadius: 8,
      };
      if (grow > 0) {
        if (mainX) data.autoWidth = grow;
        else data.autoHeight = grow;
      }
      const rect = new Rect(data as ConstructorParameters<typeof Rect>[0]);
      box.add(rect);
      children.push(rect);
    }
  }

  function measure(): LayoutSnapshot {
    if (!children.length) {
      return {
        flow: String(box.flow),
        firstX: 0,
        firstY: 0,
        gapMeasured: null,
        lastMainSize: 0,
        lines: 0,
      };
    }
    const mainX = isMainX((box.flow as FlowOption) ?? 'x');
    const bounds = children.map((child) => {
      // 相对容器（box）本地坐标系读坐标：首项落在 padding 内(~12,12)，随 flowAlign 移动。
      const b = child.getBounds('box', box);
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });

    // 主轴/交叉轴取值助手：flow-x 主轴是横向，flow-y 主轴是纵向。
    const crossKey = (b: typeof bounds[number]) => Math.round(mainX ? b.y : b.x);
    const mainPos = (b: typeof bounds[number]) => (mainX ? b.x : b.y);
    const mainSize = (b: typeof bounds[number]) => (mainX ? b.w : b.h);

    // 行/列数：交叉轴方向不同的位置各算一行/列。
    const lineKeys = new Set(bounds.map(crossKey));

    // 项间间距：取首项所在行/列，按主轴坐标排序后量相邻两项的净间距。
    // 按布局顺序而非数组顺序，避免 x-reverse / y-reverse 时量出负值。
    let gapMeasured: number | null = null;
    if (bounds.length >= 2) {
      const firstLineCross = crossKey(bounds[0]);
      const lineItems = bounds
        .filter((b) => crossKey(b) === firstLineCross)
        .sort((a, b) => mainPos(a) - mainPos(b));
      if (lineItems.length >= 2) {
        const a = lineItems[0];
        const b = lineItems[1];
        gapMeasured = Math.round(mainPos(b) - (mainPos(a) + mainSize(a)));
      }
    }

    const first = bounds[0];
    const last = bounds[bounds.length - 1];
    return {
      flow: String(box.flow),
      firstX: Math.round(first.x),
      firstY: Math.round(first.y),
      gapMeasured,
      lastMainSize: Math.round(mainSize(last)),
      lines: lineKeys.size,
    };
  }

  let current: LayoutOptions = {
    flow: 'x',
    gap: 8,
    flowAlign: 'top-left',
    flowWrap: false,
    growLast: 0,
    childCount: 3,
  };

  function syncReadout() {
    // 设值后强制同步布局，保证 getBounds 读到的是排列后的坐标。
    leafer.updateLayout();
    emit(measure());
  }

  fitContainer();
  applyToBox(current);
  syncReadout();
  // 首轮渲染、布局就绪后再派发一次兜底。
  leafer.nextRender(syncReadout);

  const resizeObserver = createResizeObserver(canvas, () => {
    fitContainer();
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      applyToBox(options);
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
