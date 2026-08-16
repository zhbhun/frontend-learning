/**
 * 范例介绍：事件记录器（参考官方 Events inspector 形态）——左侧画布可真实交互，
 * 事件按派发顺序实时进入右侧记录面板，readout 同步最近事件与关键字段——
 * 1. 双路派发：canvas.fire('mouse:down') 先于 target.fire('mousedown')，
 *    mouse:down:before 再往前；面板里画布/对象两级标签可直接对照；
 * 2. 载荷字段：mouse:* 族带 e/target/subTargets/scenePoint/viewportPoint
 *    （down 附 alreadySelected、up 附 isClick）；对象级 moving 族是 e/transform/pointer；
 * 3. 目标发现开关：targetFindTolerance（仅逐像素命中时扩大采样半径）、
 *    perPixelTargetFind（包围盒 → 实际像素）、skipTargetFind（不找目标）、
 *    subTargetCheck（分组收集 subTargets 并向内层对象派发）；
 * 4. 点击行为：fireRightClick 关闭后右键不再派发 mouse:down/up；contextmenu 不受影响。
 * 输入：上述目标发现/点击开关，加「记录 mouse:move」「记录对象级事件」两个过滤器。
 * 预期结果：面板条目与 readout 逐项对应正文断言；空白处点击 target 为 —。
 * 阅读主线：wireScene() 的订阅清单 → pushEntry() 的双路记录 → update() 的开关落点。
 */
import {
  Canvas,
  Circle,
  Group,
  Rect,
  Triangle,
  type FabricObject,
  type Point,
} from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface EventsOptions {
  /** targetFindTolerance：像素命中采样半径（仅逐像素命中时生效） */
  targetFindTolerance: number;
  /** perPixelTargetFind：按实际像素而非包围盒命中 */
  perPixelTargetFind: boolean;
  /** skipTargetFind：跳过目标发现，target 恒为空 */
  skipTargetFind: boolean;
  /** 分组的 subTargetCheck：收集 subTargets 并向内层派发对象级事件 */
  subTargetCheck: boolean;
  /** fireRightClick：右键是否派发 mouse:down/up */
  fireRightClick: boolean;
  /** 过滤器：是否记录 mouse:move */
  logMove: boolean;
  /** 过滤器：是否记录对象级事件 */
  logObjectEvents: boolean;
}

/** 派生读数：由 readout 显示 */
export interface EventsSnapshot {
  /** 最近一次被记录的事件（名称 + 级别） */
  lastEvent: string;
  /** 最近指针事件的 target 类型（type · 名字），无目标为 — */
  targetType: string;
  /** 最近指针事件的 subTargets 名单，无为 — */
  subTargets: string;
  /** 最近指针事件的场景坐标 */
  scenePoint: string;
  /** 最近指针事件的视口坐标 */
  viewportPoint: string;
}

export interface EventsInstance {
  update(options: EventsOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 面板最多保留的条目数（新事件在上） */
const MAX_ENTRIES = 12;

interface LogEntry {
  level: 'canvas' | 'object';
  name: string;
  detail: string;
}

export function createEvents(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: EventsSnapshot) => void,
): EventsInstance {
  const stage = canvasEl.parentElement ?? canvasEl;
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // ---- 场景：矩形 / 圆 / 分组（三角 + 内块）。圆用来观察包围盒与像素命中的差异，
  // 分组用来观察 subTargets 与内层对象级事件。
  const rect = new Rect({
    width: 132,
    height: 96,
    fill: '#ef4444',
    opacity: 0.9,
  });
  const circle = new Circle({ radius: 54, fill: '#3b82f6', opacity: 0.9 });
  const triangle = new Triangle({
    width: 92,
    height: 82,
    fill: '#22c55e',
    opacity: 0.9,
  });
  const inner = new Rect({
    left: 64,
    top: 44,
    width: 60,
    height: 60,
    fill: '#eab308',
    opacity: 0.95,
  });
  const group = new Group([triangle, inner], { subTargetCheck: true });
  fabricCanvas.add(rect, circle, group);

  const names = new Map<FabricObject, string>([
    [rect, '矩形'],
    [circle, '圆'],
    [group, '分组'],
    [triangle, '三角'],
    [inner, '内块'],
  ]);

  // ---- 右侧记录面板：DOM 侧栏，随舞台自适应，pointer-events 关闭避免拦截交互
  const panel = document.createElement('div');
  panel.className = 'evlog';
  // 挂载前先给兜底宽度，syncSize 会按舞台实际尺寸重新计算
  panel.style.width = '280px';
  const panelStyle = document.createElement('style');
  panelStyle.textContent = `
.evlog { position: absolute; top: 0; right: 0; bottom: 0; display: flex;
  flex-direction: column; background: rgba(255,255,255,0.94);
  border-left: 1px solid #dbe3f0; pointer-events: none;
  font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; color: #334155; }
.evlog__title { padding: 8px 10px 6px; font-weight: 600; color: #0f172a;
  border-bottom: 1px solid #eef2f7; }
.evlog__hint { padding: 4px 10px 6px; color: #64748b; font-size: 10px;
  border-bottom: 1px solid #eef2f7; }
.evlog__rows { flex: 1; overflow: hidden; padding: 6px 10px;
  display: flex; flex-direction: column; gap: 3px; }
.evlog__row { display: flex; gap: 6px; align-items: baseline; white-space: nowrap; }
.evlog__lv { flex: none; padding: 0 4px; border-radius: 3px; font-size: 10px; }
.evlog__lv--canvas { background: #dbeafe; color: #1d4ed8; }
.evlog__lv--object { background: #d1fae5; color: #047857; }
.evlog__name { flex: none; font-weight: 600; }
.evlog__detail { overflow: hidden; text-overflow: ellipsis; color: #475569; }`;
  panel.append(panelStyle);

  const title = document.createElement('div');
  title.className = 'evlog__title';
  title.textContent = '事件记录器（新 → 旧）';
  const hint = document.createElement('div');
  hint.className = 'evlog__hint';
  hint.textContent = '画布级蓝色 · 对象级绿色';
  const rowsRoot = document.createElement('div');
  rowsRoot.className = 'evlog__rows';
  panel.append(title, hint, rowsRoot);

  interface RowRefs {
    root: HTMLDivElement;
    lv: HTMLSpanElement;
    name: HTMLSpanElement;
    detail: HTMLSpanElement;
  }
  const rowEls: RowRefs[] = [];
  for (let i = 0; i < MAX_ENTRIES; i++) {
    const root = document.createElement('div');
    root.className = 'evlog__row';
    const lv = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'evlog__name';
    const detail = document.createElement('span');
    detail.className = 'evlog__detail';
    root.append(lv, name, detail);
    rowsRoot.append(root);
    rowEls.push({ root, lv, name, detail });
  }

  const entries: LogEntry[] = [];

  let current: EventsOptions = {
    targetFindTolerance: 0,
    perPixelTargetFind: false,
    skipTargetFind: false,
    subTargetCheck: true,
    fireRightClick: true,
    logMove: true,
    logObjectEvents: true,
  };

  let snapshot: EventsSnapshot = {
    lastEvent: '等待交互…',
    targetType: '—',
    subTargets: '—',
    scenePoint: '—',
    viewportPoint: '—',
  };

  // ---- 工具：名字与坐标的统一格式
  const describeTarget = (obj?: FabricObject | null) =>
    (obj && names.get(obj)) || '—';
  const pointText = (p: Point) =>
    `(${Math.round(p.x)},${Math.round(p.y)})`;
  const listNames = (objects?: FabricObject[]) =>
    objects?.map((obj) => names.get(obj)).join('、') || '—';

  function trackPointer(opt: {
    target?: FabricObject;
    subTargets?: FabricObject[];
    scenePoint: Point;
    viewportPoint: Point;
  }) {
    snapshot.scenePoint = pointText(opt.scenePoint);
    snapshot.viewportPoint = pointText(opt.viewportPoint);
    snapshot.targetType = opt.target
      ? `${opt.target.type} · ${names.get(opt.target)}`
      : '—';
    snapshot.subTargets = listNames(opt.subTargets);
  }

  function pushEntry(level: 'canvas' | 'object', name: string, detail: string) {
    entries.unshift({ level, name, detail });
    if (entries.length > MAX_ENTRIES) {
      entries.length = MAX_ENTRIES;
    }
    snapshot.lastEvent = `${name}（${level === 'canvas' ? '画布' : '对象'}）`;
    for (let i = 0; i < rowEls.length; i++) {
      const row = rowEls[i];
      const entry = entries[i];
      if (!entry) {
        row.root.style.visibility = 'hidden';
        continue;
      }
      row.root.style.visibility = 'visible';
      row.lv.textContent = entry.level === 'canvas' ? '画布' : '对象';
      row.lv.className = `evlog__lv evlog__lv--${entry.level}`;
      row.name.textContent = entry.name;
      row.detail.textContent = entry.detail;
    }
    emit({ ...snapshot });
  }

  // ---- 订阅：画布级事件族（与正文家族清单一一对应）
  function wireScene() {
    fabricCanvas.on('mouse:down:before', (opt) => {
      pushEntry('canvas', 'mouse:down:before', describeTarget(opt.target));
    });
    fabricCanvas.on('mouse:down', (opt) => {
      trackPointer(opt);
      pushEntry(
        'canvas',
        'mouse:down',
        `${describeTarget(opt.target)}${pointText(opt.scenePoint)} 已选:${
          opt.alreadySelected ? '是' : '否'
        }`,
      );
    });
    fabricCanvas.on('mouse:move', (opt) => {
      // 坐标读数始终实时；是否进面板由过滤器决定
      trackPointer(opt);
      if (current.logMove) {
        pushEntry(
          'canvas',
          'mouse:move',
          `${describeTarget(opt.target)}${pointText(opt.scenePoint)}`,
        );
      } else {
        emit({ ...snapshot });
      }
    });
    fabricCanvas.on('mouse:up', (opt) => {
      trackPointer(opt);
      pushEntry(
        'canvas',
        'mouse:up',
        `${describeTarget(opt.target)} 是点击:${opt.isClick ? '是' : '否'}`,
      );
    });
    fabricCanvas.on('mouse:over', (opt) => {
      trackPointer(opt);
      pushEntry(
        'canvas',
        'mouse:over',
        `进入 ${describeTarget(opt.target)}（原 ${describeTarget(opt.previousTarget)}）`,
      );
    });
    fabricCanvas.on('mouse:out', (opt) => {
      trackPointer(opt);
      pushEntry(
        'canvas',
        'mouse:out',
        `离开 ${describeTarget(opt.target)} → ${describeTarget(opt.nextTarget)}`,
      );
    });
    fabricCanvas.on('mouse:wheel', (opt) => {
      trackPointer(opt);
      pushEntry(
        'canvas',
        'mouse:wheel',
        `${describeTarget(opt.target)} ΔY=${Math.round(opt.e.deltaY)}${pointText(
          opt.scenePoint,
        )}`,
      );
    });
    fabricCanvas.on('mouse:dblclick', (opt) => {
      pushEntry('canvas', 'mouse:dblclick', describeTarget(opt.target));
    });
    fabricCanvas.on('mouse:tripleclick', (opt) => {
      pushEntry('canvas', 'mouse:tripleclick', describeTarget(opt.target));
    });
    fabricCanvas.on('contextmenu', (opt) => {
      snapshot.targetType = opt.target
        ? `${opt.target.type} · ${names.get(opt.target)}`
        : '—';
      // 载荷类型标的是 Event，运行时实际是 MouseEvent，读取 button 需要收窄
      const button = (opt.e as MouseEvent).button;
      pushEntry(
        'canvas',
        'contextmenu',
        `${describeTarget(opt.target)} button=${button}`,
      );
    });

    fabricCanvas.on('before:selection:cleared', (opt) => {
      pushEntry('canvas', 'before:selection:cleared', `-${listNames(opt.deselected)}`);
    });
    fabricCanvas.on('selection:cleared', (opt) => {
      snapshot.targetType = '—';
      snapshot.subTargets = '—';
      pushEntry('canvas', 'selection:cleared', `-${listNames(opt.deselected)}`);
    });
    fabricCanvas.on('selection:created', (opt) => {
      snapshot.targetType = opt.selected[0]
        ? `${opt.selected[0].type} · ${names.get(opt.selected[0])}`
        : '—';
      pushEntry('canvas', 'selection:created', `+${listNames(opt.selected)}`);
    });
    fabricCanvas.on('selection:updated', (opt) => {
      pushEntry(
        'canvas',
        'selection:updated',
        `+${listNames(opt.selected)} -${listNames(opt.deselected)}`,
      );
    });

    (['object:moving', 'object:scaling', 'object:rotating'] as const).forEach(
      (eventName) => {
        fabricCanvas.on(eventName, (opt) => {
          pushEntry(
            'canvas',
            eventName,
            `${describeTarget(opt.target)} action:${opt.transform?.action ?? '—'}`,
          );
        });
      },
    );
    fabricCanvas.on('object:modified', (opt) => {
      pushEntry(
        'canvas',
        'object:modified',
        `${describeTarget(opt.target)} action:${opt.action ?? '—'}`,
      );
    });
  }

  // ---- 订阅：对象级事件族（target 与每个 subTarget 都会各收到一份）
  function wireObject(obj: FabricObject) {
    (['mousedown', 'mouseup', 'mousedblclick', 'mousetripleclick'] as const).forEach(
      (eventName) => {
        obj.on(eventName, (opt) => {
          if (!current.logObjectEvents) {
            return;
          }
          pushEntry(
            'object',
            eventName,
            `${describeTarget(obj)}${pointText(opt.scenePoint)}`,
          );
        });
      },
    );
    obj.on('mouseover', () => {
      if (current.logObjectEvents) {
        pushEntry('object', 'mouseover', `悬停进入 ${describeTarget(obj)}`);
      }
    });
    obj.on('mouseout', () => {
      if (current.logObjectEvents) {
        pushEntry('object', 'mouseout', `悬停离开 ${describeTarget(obj)}`);
      }
    });
    (['moving', 'scaling', 'rotating'] as const).forEach((eventName) => {
      obj.on(eventName, (opt) => {
        if (!current.logObjectEvents) {
          return;
        }
        pushEntry(
          'object',
          eventName,
          `${describeTarget(obj)} pointer(${Math.round(opt.pointer.x)},${Math.round(
            opt.pointer.y,
          )})`,
        );
      });
    });
    obj.on('modified', (opt) => {
      if (current.logObjectEvents) {
        pushEntry('object', 'modified', `action:${opt.action ?? '—'}`);
      }
    });
    obj.on('selected', () => {
      snapshot.targetType = `${obj.type} · ${names.get(obj)}`;
      pushEntry('object', 'selected', describeTarget(obj));
    });
    obj.on('deselected', () => {
      pushEntry('object', 'deselected', describeTarget(obj));
    });
  }

  wireScene();
  [rect, circle, group, triangle, inner].forEach(wireObject);

  // ---- 布局与尺寸：画布占舞台左侧，面板占右侧
  function applyLayout(width: number, height: number) {
    rect.set({ left: width * 0.08, top: height * 0.12 });
    circle.set({ left: width * 0.52, top: height * 0.1 });
    group.set({ left: width * 0.3, top: height * 0.54 });
  }

  function syncSize() {
    if (!stage.isConnected) {
      return;
    }
    const stageWidth = Math.floor(stage.clientWidth);
    const stageHeight = Math.floor(stage.clientHeight);
    const panelWidth = Math.max(190, Math.min(330, Math.round(stageWidth * 0.34)));
    panel.style.width = `${panelWidth}px`;
    const width = Math.max(240, stageWidth - panelWidth - 14);
    const height = Math.max(200, stageHeight - 14);
    applyLayout(width, height);
    fabricCanvas.wrapperEl.style.margin = '7px';
    // setDimensions 自动 requestRenderAll；位置改动由它一并带回画面
    fabricCanvas.setDimensions({ width, height });
  }

  function update(options: EventsOptions) {
    current = { ...options };
    // setTargetFindTolerance 会同步调整像素探测画布的尺寸，直接赋值属性不会
    fabricCanvas.setTargetFindTolerance(options.targetFindTolerance);
    fabricCanvas.perPixelTargetFind = options.perPixelTargetFind;
    fabricCanvas.skipTargetFind = options.skipTargetFind;
    group.subTargetCheck = options.subTargetCheck;
    fabricCanvas.fireRightClick = options.fireRightClick;
    emit({ ...snapshot });
  }

  applyLayout(INITIAL_SIZE.width, INITIAL_SIZE.height);
  if (stage !== canvasEl) {
    stage.append(panel);
  }
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );
  syncSize();
  emit({ ...snapshot });

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      panel.remove();
      void fabricCanvas.dispose();
    },
  };
}
