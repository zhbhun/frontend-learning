/**
 * 演示内容：LeaferJS 事件系统 —— on 绑定、事件类型（pointer/click/drag/enter/leave）、
 *           事件流（捕获 capture → 目标 → 冒泡 bubble）、命中检测（hitBox / 路径命中）与按键状态（ctrlKey 等）。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入：图形类型 shape（rect/ellipse/star）、命中方式 hitBox（包围盒 vs 路径）、捕获阶段 capture。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas>；建一个 Group 容器（事件流的「父级」），
 *           内含一个可拖动图形（命中目标）。Group 上绑定 pointer.down/up、click、double_click（capture 开关切换
 *           其在捕获/冒泡阶段挂载，读数 phase 随之从 1 变 3）；图形上绑定 pointer.enter/leave、drag.start/drag/end。
 *           hitBox 开关切换图形的命中区域：路径命中（默认）下点击星形透明拐角会穿透到 Group；包围盒命中下则命中图形。
 *           每次事件触发把 类型/目标 tag/当前 tag/阶段/坐标/按键 写入 readout。
 * 预期结果：悬停图形 → pointer.enter，目标=图形、视觉高亮；点击图形 → click 冒泡到 Group，capture 关=阶段 3，开=阶段 1；
 *           按住 Ctrl/Shift 点击 → 按键读数显示对应修饰键；星形 + hitBox 关 → 点透明拐角穿透，目标=Group；hitBox 开 → 目标=图形。
 * 阅读主线：createEvents → Leafer/Group/图形 构造与挂载 → attachListeners(capture) → report 派发读数 → update 同步开关 → dispose 销毁。
 */
import {
  Leafer,
  Group,
  Rect,
  Ellipse,
  Star,
  Text,
  PointerEvent,
  DragEvent,
  type IUI,
  type IUIEvent,
} from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EventShapeType = 'rect' | 'ellipse' | 'star';

export interface EventOptions {
  shape: EventShapeType;
  /** 图形是否按包围盒命中（true）或按实际路径命中（false，默认）。 */
  hitBox: boolean;
  /** Group 的点击类监听是否挂在捕获阶段。 */
  capture: boolean;
}

export interface EventSnapshot {
  /** 最近一次事件类型，如 click / pointer.enter / drag.start。 */
  type: string;
  /** 命中目标的 tag（Rect / Ellipse / Star / Group / Leafer）。 */
  target: string;
  /** 触发监听的当前节点 tag（监听挂在谁身上）。 */
  current: string;
  /** 事件流阶段：1 捕获 / 2 目标 / 3 冒泡。 */
  phase: string;
  /** 指针在世界坐标系（leafer 画布）下的坐标。 */
  point: string;
  /** 修饰键状态：Ctrl / Shift / Alt / Meta 的组合。 */
  keys: string;
}

export interface EventInstance {
  update(options: EventOptions): void;
  dispose(): void;
}

const BASE_FILL = '#5b8def';
const HOVER_FILL = '#ff8a5b';
const GROUP_FILL = '#eef2ff';
const GROUP_STROKE = '#a5b4fc';
const TEXT_COLOR = '#475569';

// 阶段常量与 @leafer-ui/core 的派发逻辑一致：1=捕获、2=目标、3=冒泡。
function phaseLabel(phase: number): string {
  switch (phase) {
    case 1:
      return '1 捕获';
    case 2:
      return '2 目标';
    case 3:
      return '3 冒泡';
    default:
      return String(phase);
  }
}

export function createEvents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventSnapshot) => void,
): EventInstance {
  let current: EventOptions = {
    shape: 'star',
    hitBox: false,
    capture: false,
  };

  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  const title = new Text({
    text: '悬停 / 点击 / 拖动图形，观察右下读数',
    fontSize: 16,
    fontWeight: 600,
    fill: TEXT_COLOR,
    hittable: false,
  });
  leafer.add(title);

  const hint = new Text({
    text: 'capture 开关切换阶段 · hitBox 开关切换命中区域 · 按住 Ctrl/Shift 点击看按键',
    fontSize: 12,
    fill: '#94a3b8',
    hittable: false,
  });
  leafer.add(hint);

  // Group 既是「事件流的父级」（事件会冒泡经过它），也是一个可命中的容器（带浅色填充）。
  const group = new Group({
    fill: GROUP_FILL,
    stroke: GROUP_STROKE,
    strokeWidth: 2,
    dash: [6, 4],
    cornerRadius: 12,
  });
  leafer.add(group);

  const groupLabel = new Text({
    text: 'Group 容器（事件冒泡经过这里）',
    fontSize: 12,
    fill: '#6366f1',
    hittable: false,
  });
  group.add(groupLabel);

  let shape: IUI | null = null;

  // 把最近一次交互事件的关键信息写入 readout。
  // IUIEvent 把 target/current/phase/type 声明为可选，交互事件运行时一定存在，这里安全取值。
  function report(e: IUIEvent) {
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Meta');

    const target = e.target as IUI | undefined;
    const current = e.current as IUI | undefined;

    emit({
      type: e.type ?? '',
      target: target ? target.tag : '—',
      current: current ? current.tag : '—',
      phase: phaseLabel(e.phase ?? 0),
      point: `${Math.round(e.x)}, ${Math.round(e.y)}`,
      keys: modifiers.length ? modifiers.join('+') : '—',
    });
  }

  // Group 的点击类监听：capture 开关决定它们挂在捕获阶段还是冒泡阶段，
  // 同一次点击图形，phase 会从 3（冒泡）切到 1（捕获）。
  function attachGroupListeners(capture: boolean) {
    // 先解绑，避免重复挂载；off 只传 type 会清掉该类型全部监听。
    group.off(PointerEvent.DOWN);
    group.off(PointerEvent.UP);
    group.off(PointerEvent.CLICK);
    group.off(PointerEvent.DOUBLE_CLICK);

    const option = { capture };
    group.on(PointerEvent.DOWN, report, option);
    group.on(PointerEvent.UP, report, option);
    group.on(PointerEvent.CLICK, report, option);
    group.on(PointerEvent.DOUBLE_CLICK, report, option);
  }

  function buildShape(options: EventOptions): IUI {
    const gw = group.__.width ?? 0;
    const gh = group.__.height ?? 0;
    const size = Math.min(gw, gh) * 0.6;
    const common = {
      around: 'center' as const,
      x: gw / 2,
      y: gh / 2,
      width: size,
      height: size,
      fill: BASE_FILL,
      stroke: '#1e3a8a',
      strokeWidth: 2,
      // 命中区域：hitBox=true 按包围盒命中（透明拐角也算命中），
      //           hitBox=false 按实际路径命中（默认，星形拐角处会穿透到下层）。
      hitBox: options.hitBox,
      // 让图形可拖动，从而触发 drag.start / drag / drag.end。
      draggable: true,
      // 限定在父级 Group 范围内拖动，避免跑出容器。
      dragBounds: 'parent' as const,
      cursor: 'pointer',
    };

    let node: IUI;
    if (options.shape === 'rect') {
      node = new Rect({ ...common, cornerRadius: 10 });
    } else if (options.shape === 'ellipse') {
      node = new Ellipse(common);
    } else {
      node = new Star({ ...common, corners: 5, innerRadius: 0.42 });
    }

    // 悬停高亮：enter 变色、leave 还原，既做视觉反馈，也演示 pointer.enter/leave。
    node.on(PointerEvent.ENTER, (e: IUIEvent) => {
      node.fill = HOVER_FILL;
      report(e);
    });
    node.on(PointerEvent.LEAVE, (e: IUIEvent) => {
      node.fill = BASE_FILL;
      report(e);
    });
    // 拖动事件：DragEvent 继承自 PointerEvent，moveX/moveY 是本帧位移，totalX/totalY 是累计。
    node.on(DragEvent.START, report);
    node.on(DragEvent.DRAG, report);
    node.on(DragEvent.END, (e: IUIEvent) => {
      node.fill = BASE_FILL;
      report(e);
    });

    return node;
  }

  function layout() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });

    title.set({ x: 24, y: 20 });
    hint.set({ x: 24, y: size.height - 28 });

    // 容器尺寸随画布自适应，留出标题与提示的空间。
    const groupW = Math.max(240, Math.min(size.width - 64, 440));
    const groupH = Math.max(160, Math.min(size.height - 120, 230));
    group.set({
      x: (size.width - groupW) / 2,
      y: (size.height - groupH) / 2 + 6,
      width: groupW,
      height: groupH,
    });
    groupLabel.set({ x: 12, y: 8 });

    // 尺寸变化后，把图形重新居中并按新尺寸重建，保持命中区域与容器一致。
    if (shape) {
      group.remove(shape);
      shape.destroy();
      shape = null;
    }
    shape = buildShape(current);
    group.add(shape);
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    layout();
    attachGroupListeners(current.capture);
  });

  layout();
  attachGroupListeners(current.capture);

  return {
    update(options) {
      const typeChanged = options.shape !== current.shape;
      current = options;

      // 图形类型变化时重建节点（监听随旧节点一起销毁）；
      // 仅 hitBox 变化时直接改属性，避免重置拖动位置。
      if (typeChanged && shape) {
        group.remove(shape);
        shape.destroy();
        shape = buildShape(options);
        group.add(shape);
      } else if (shape && options.hitBox !== shape.__.hitBox) {
        shape.hitBox = options.hitBox;
      }

      // capture 变化时重新挂载 Group 监听。
      attachGroupListeners(options.capture);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
