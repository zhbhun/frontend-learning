/**
 * 范例介绍：7 个独立画布组成"拖拽与选择"行为开关实验台——
 * 1. SwitchBench 对象开关：evented 决定谁能被命中，selectable 决定命中后能否被选中与拖动；
 * 2. LockBench 锁定族：lock* 只约束选中后的变换动作（拖/转/缩/斜），不阻止选中；
 * 3. MarqueeBench 框选：拖空白收集 selectable 且 visible 的对象，相交 / 完全包含两种口径；
 * 4. MultiSelectBench 多选：selectionKey（默认 shiftKey）点选加减成员，ActiveSelection 缩到 1 个自动解散；
 * 5. TargetBench 命中配置：skipTargetFind 关点选、perPixelTargetFind 像素级命中、preserveObjectStacking 层叠策略；
 * 6. KeyBench 修饰键：uniScaleKey 反转等比、centeredKey 反转居中、altActionKey 把侧柄缩放换成倾斜；
 * 7. ProgrammaticBench 编程式选择：setActiveObject / discardActiveObject 与 selection 事件载荷。
 * 输入：每个实验台各自由 Controls 提供开关；读者直接在画布上拖拽 / 框选 / shift 点选验证行为差异。
 * 预期结果：readout 全部用公开 API（getActiveObject / getActiveObjects / 事件载荷 / 属性读数）给出可核对读数。
 * 阅读主线：7 个 create* 函数各对应正文一个小节，update() 展示对应配置的最小用法。
 */
import { ActiveSelection, Canvas, Circle, FabricText, Rect, Triangle } from 'fabric';
import type { FabricObject } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

/** 共享的舞台装配：创建交互画布并跟随共享舞台尺寸；dispose 释放观察器与画布 */
function setupStage(
  canvasEl: HTMLCanvasElement,
  syncSize: (width: number, height: number) => void,
) {
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () => {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    syncSize(width, height);
  });
  return {
    fabricCanvas,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}

/** 只做视觉对照的小标签：selectable / evented 双关，绝不参与交互与命中 */
function createLabel(text: string, x: number, y: number) {
  return new FabricText(text, {
    left: x,
    top: y,
    fontSize: 11,
    fill: '#64748b',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    selectable: false,
    evented: false,
  });
}

/** 选中集读数的统一描述：对象用标签名，ActiveSelection 用类名，空用 '—' */
function describeObject(
  object: FabricObject | undefined,
  labels: Map<FabricObject, string>,
): string {
  if (!object) {
    return '—';
  }
  return labels.get(object) ?? (object.isType('ActiveSelection') ? 'ActiveSelection' : '对象');
}

function describeList(
  objects: FabricObject[],
  labels: Map<FabricObject, string>,
): string {
  if (objects.length === 0) {
    return '—';
  }
  return objects.map((object) => describeObject(object, labels)).join(', ');
}

/** 统一注册 selection 系列事件：记录事件名与载荷，并触发读数刷新 */
function trackSelectionEvents(
  fabricCanvas: Canvas,
  labels: Map<FabricObject, string>,
  onEvent: (summary: string) => void,
  refresh: () => void,
) {
  fabricCanvas.on('selection:created', (event) => {
    onEvent(`selection:created（selected: ${describeList(event.selected, labels)}）`);
    refresh();
  });
  fabricCanvas.on('selection:updated', (event) => {
    onEvent(
      `selection:updated（selected: ${describeList(event.selected, labels)}, deselected: ${describeList(event.deselected, labels)}）`,
    );
    refresh();
  });
  fabricCanvas.on('selection:cleared', (event) => {
    onEvent(`selection:cleared（deselected: ${describeList(event.deselected, labels)}）`);
    refresh();
  });
}

// ---------------------------------------------------------------------------
// 范例 1：对象开关——evented 决定能否被命中，selectable 决定能否被选中
// ---------------------------------------------------------------------------

export interface SwitchBenchOptions {
  switchSelectable: boolean;
  switchEvented: boolean;
  switchActiveOn: 'down' | 'up';
}

export interface SwitchBenchSnapshot {
  lastDownHit: string;
  activeObject: string;
  activeObjects: string;
  targetSwitches: string;
}

export interface SwitchBenchInstance {
  update(options: SwitchBenchOptions): void;
  dispose(): void;
}

export function createSwitchBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: SwitchBenchSnapshot) => void,
): SwitchBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });
  const labels = new Map<FabricObject, string>();

  const rectA = new Rect({ left: 150, top: 150, width: 110, height: 80, fill: '#4f7cff' });
  const rectB = new Rect({ left: 440, top: 240, width: 120, height: 90, fill: '#94a3b8' });
  const circleC = new Circle({ left: 310, top: 110, radius: 45, fill: '#10b981' });
  labels.set(rectA, 'A');
  labels.set(rectB, 'B');
  labels.set(circleC, 'C');
  stage.fabricCanvas.add(
    rectA,
    rectB,
    circleC,
    createLabel('A（开关目标）', 150, 96),
    createLabel('B', 440, 184),
    createLabel('C', 310, 46),
  );

  let lastDownHit = '—';

  function emitSnapshot() {
    const active = stage.fabricCanvas.getActiveObject();
    emit({
      lastDownHit,
      activeObject: describeObject(active, labels),
      activeObjects: describeList(stage.fabricCanvas.getActiveObjects(), labels),
      targetSwitches: `A: selectable=${rectA.selectable}, evented=${rectA.evented}, activeOn='${rectA.activeOn}'`,
    });
  }

  stage.fabricCanvas.on('mouse:down', (event) => {
    // mouse:down 的 target 就是目标发现（findTarget）的结果
    lastDownHit = describeObject(event.target, labels);
    emitSnapshot();
  });
  trackSelectionEvents(stage.fabricCanvas, labels, () => {}, emitSnapshot);

  function update(options: SwitchBenchOptions) {
    rectA.set({
      selectable: options.switchSelectable,
      evented: options.switchEvented,
      activeOn: options.switchActiveOn,
    });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 2：锁定族——锁的是选中后的变换动作，不阻止选中与事件
// ---------------------------------------------------------------------------

export interface LockBenchOptions {
  lockMoveX: boolean;
  lockMoveY: boolean;
  lockRotation: boolean;
  lockScalingX: boolean;
  lockScalingY: boolean;
}

export interface LockBenchSnapshot {
  locks: string;
  lastAction: string;
  leftTop: string;
  angleScale: string;
}

export interface LockBenchInstance {
  update(options: LockBenchOptions): void;
  dispose(): void;
}

export function createLockBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: LockBenchSnapshot) => void,
): LockBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  const rectD = new Rect({ left: 320, top: 195, width: 150, height: 100, fill: '#4f7cff' });
  // 标签放底侧：上方是 mtr 旋转手柄（offsetY -40）的位置
  stage.fabricCanvas.add(rectD, createLabel('D（开关目标）', 320, 268));

  let lastAction = '—';

  function emitSnapshot() {
    emit({
      locks: `lock: moveX=${rectD.lockMovementX}, moveY=${rectD.lockMovementY}, rotation=${rectD.lockRotation}, scalingX=${rectD.lockScalingX}, scalingY=${rectD.lockScalingY}`,
      lastAction,
      leftTop: `${Math.round(rectD.left)}, ${Math.round(rectD.top)}`,
      angleScale: `${Math.round(rectD.angle)}° / ${rectD.scaleX.toFixed(2)}×${rectD.scaleY.toFixed(2)}`,
    });
  }

  // 拖动 / 缩放 / 旋转时事件载荷里带 transform.action（drag / scale / scaleX / rotate…），
  // 读数能直接核对被锁的轴是否冻结
  const trackTransform =
    () =>
    (event: { transform?: { action?: string } }): void => {
      lastAction = event.transform?.action ?? '—';
      emitSnapshot();
    };
  stage.fabricCanvas.on('object:moving', trackTransform());
  stage.fabricCanvas.on('object:scaling', trackTransform());
  stage.fabricCanvas.on('object:rotating', trackTransform());

  function update(options: LockBenchOptions) {
    rectD.set({
      lockMovementX: options.lockMoveX,
      lockMovementY: options.lockMoveY,
      lockRotation: options.lockRotation,
      lockScalingX: options.lockScalingX,
      lockScalingY: options.lockScalingY,
    });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 3：框选——拖空白收集 selectable 且 visible 的对象（不看 evented）
// ---------------------------------------------------------------------------

export interface MarqueeBenchOptions {
  marqueeSelection: boolean;
  fullyContained: boolean;
  dashed: boolean;
  marqueeLineWidth: number;
}

export interface MarqueeBenchSnapshot {
  selectionConfig: string;
  lastSelectionEvent: string;
  activeObjects: string;
}

export interface MarqueeBenchInstance {
  update(options: MarqueeBenchOptions): void;
  dispose(): void;
}

export function createMarqueeBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: MarqueeBenchSnapshot) => void,
): MarqueeBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });
  const labels = new Map<FabricObject, string>();

  const rectR = new Rect({
    left: 210,
    top: 170,
    width: 200,
    height: 140,
    fill: 'rgba(79, 124, 255, 0.35)',
    stroke: '#4f7cff',
  });
  // C 完全落在 R 内部：框住 R 的大半但不全含 R 时，两种口径的收集结果不同
  const circleC = new Circle({ left: 270, top: 210, radius: 24, fill: '#10b981' });
  // T 关掉 selectable：点选、框选都进不了选中集
  const triangleT = new Triangle({
    left: 500,
    top: 140,
    width: 90,
    height: 80,
    fill: '#f59e0b',
    selectable: false,
  });
  // S 关掉 evented：点不中（穿透），但框选仍能收集
  const rectS = new Rect({
    left: 490,
    top: 265,
    width: 90,
    height: 70,
    fill: null,
    stroke: '#e11d48',
    strokeWidth: 3,
    evented: false,
  });
  labels.set(rectR, 'R');
  labels.set(circleC, 'C');
  labels.set(triangleT, 'T');
  labels.set(rectS, 'S');
  stage.fabricCanvas.add(
    rectR,
    circleC,
    triangleT,
    rectS,
    createLabel('R（半透明）', 210, 92),
    createLabel('C', 270, 172),
    createLabel('T（selectable: false）', 500, 92),
    createLabel('S（evented: false）', 490, 218),
  );

  let lastSelectionEvent = '—';

  function emitSnapshot() {
    emit({
      selectionConfig: `canvas: selection=${stage.fabricCanvas.selection}, selectionFullyContained=${stage.fabricCanvas.selectionFullyContained}, selectionDashArray=${JSON.stringify(stage.fabricCanvas.selectionDashArray)}, selectionLineWidth=${stage.fabricCanvas.selectionLineWidth}`,
      lastSelectionEvent,
      activeObjects: describeList(stage.fabricCanvas.getActiveObjects(), labels),
    });
  }

  trackSelectionEvents(stage.fabricCanvas, labels, (summary) => {
    lastSelectionEvent = summary;
  }, emitSnapshot);

  function update(options: MarqueeBenchOptions) {
    stage.fabricCanvas.set({
      selection: options.marqueeSelection,
      selectionFullyContained: options.fullyContained,
      // 默认 [] 是实线；给一组虚线值立刻能在框选矩形上看到
      selectionDashArray: options.dashed ? [4, 3] : [],
      selectionLineWidth: options.marqueeLineWidth,
    });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 4：多选——selectionKey 点选加减成员，ActiveSelection 缩到 1 个自动解散
// ---------------------------------------------------------------------------

export type MultiSelectKeyValue = 'shiftKey' | 'ctrlKey' | 'both';

export interface MultiSelectBenchOptions {
  multiSelectKey: MultiSelectKeyValue;
}

export interface MultiSelectBenchSnapshot {
  selectionKey: string;
  activeObject: string;
  activeObjects: string;
  activeCount: number;
}

export interface MultiSelectBenchInstance {
  update(options: MultiSelectBenchOptions): void;
  dispose(): void;
}

export function createMultiSelectBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: MultiSelectBenchSnapshot) => void,
): MultiSelectBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });
  const labels = new Map<FabricObject, string>();

  const rectE = new Rect({ left: 170, top: 160, width: 100, height: 80, fill: '#4f7cff' });
  const circleF = new Circle({ left: 330, top: 140, radius: 42, fill: '#10b981' });
  const triangleG = new Triangle({ left: 490, top: 220, width: 100, height: 84, fill: '#f59e0b' });
  labels.set(rectE, 'E');
  labels.set(circleF, 'F');
  labels.set(triangleG, 'G');
  stage.fabricCanvas.add(
    rectE,
    circleF,
    triangleG,
    createLabel('E', 170, 108),
    createLabel('F', 330, 86),
    createLabel('G', 490, 168),
  );

  function emitSnapshot() {
    const active = stage.fabricCanvas.getActiveObject();
    const key = stage.fabricCanvas.selectionKey;
    emit({
      selectionKey: Array.isArray(key) ? JSON.stringify(key) : `'${String(key)}'`,
      activeObject: describeObject(active, labels),
      activeObjects: describeList(stage.fabricCanvas.getActiveObjects(), labels),
      activeCount: stage.fabricCanvas.getActiveObjects().length,
    });
  }

  trackSelectionEvents(stage.fabricCanvas, labels, () => {}, emitSnapshot);

  function update(options: MultiSelectBenchOptions) {
    // selectionKey 可以是单个修饰键，也可以是数组（任一按下即生效）
    stage.fabricCanvas.set(
      'selectionKey',
      options.multiSelectKey === 'both'
        ? ['shiftKey', 'ctrlKey']
        : options.multiSelectKey,
    );
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 5：命中配置——目标发现的开关、容差与层叠策略
// ---------------------------------------------------------------------------

export interface TargetBenchOptions {
  skipFind: boolean;
  perPixel: boolean;
  tolerance: number;
  preserveStacking: boolean;
  altSelKey: boolean;
}

export interface TargetBenchSnapshot {
  targetConfig: string;
  lastDownHit: string;
  lastHoverHit: string;
}

export interface TargetBenchInstance {
  update(options: TargetBenchOptions): void;
  dispose(): void;
}

export function createTargetBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: TargetBenchSnapshot) => void,
): TargetBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });
  const labels = new Map<FabricObject, string>();

  // 布局：X 在底层，圆环 O 压住 X 右半（圆环空心处与 X 重叠），K 在最上层压住 X 左上
  const rectX = new Rect({ left: 170, top: 190, width: 180, height: 120, fill: '#4f7cff' });
  const ringO = new Circle({
    left: 250,
    top: 220,
    radius: 55,
    fill: null,
    stroke: '#e11d48',
    strokeWidth: 14,
  });
  const triangleK = new Triangle({
    left: 150,
    top: 150,
    width: 90,
    height: 76,
    fill: '#10b981',
  });
  labels.set(rectX, 'X（底层）');
  labels.set(ringO, 'O（圆环）');
  labels.set(triangleK, 'K（最上层）');
  stage.fabricCanvas.add(
    rectX,
    ringO,
    triangleK,
    createLabel('X（底层矩形）', 120, 285),
    createLabel('O（空心圆环）', 340, 140),
    createLabel('K（最上层）', 150, 92),
  );

  let lastDownHit = '—';
  let lastHoverHit = '—';

  function emitSnapshot() {
    emit({
      targetConfig: `canvas: skipTargetFind=${stage.fabricCanvas.skipTargetFind}, perPixelTargetFind=${stage.fabricCanvas.perPixelTargetFind}, targetFindTolerance=${stage.fabricCanvas.targetFindTolerance}, preserveObjectStacking=${stage.fabricCanvas.preserveObjectStacking}, altSelectionKey=${stage.fabricCanvas.altSelectionKey ? `'${String(stage.fabricCanvas.altSelectionKey)}'` : 'undefined'}`,
      lastDownHit,
      lastHoverHit,
    });
  }

  stage.fabricCanvas.on('mouse:down', (event) => {
    lastDownHit = describeObject(event.target, labels);
    emitSnapshot();
  });
  stage.fabricCanvas.on('mouse:over', (event) => {
    lastHoverHit = describeObject(event.target, labels);
    emitSnapshot();
  });

  function update(options: TargetBenchOptions) {
    stage.fabricCanvas.set({
      skipTargetFind: options.skipFind,
      perPixelTargetFind: options.perPixel,
      preserveObjectStacking: options.preserveStacking,
      altSelectionKey: options.altSelKey ? 'altKey' : undefined,
    });
    // 直接 set targetFindTolerance 只改数字；setTargetFindTolerance 会同步像素命中缓冲画布
    stage.fabricCanvas.setTargetFindTolerance(options.tolerance);
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 6：修饰键与中心化——按住修饰键临时反转等比与居中
// ---------------------------------------------------------------------------

export interface KeyBenchOptions {
  centeredScale: boolean;
  uniform: boolean;
}

export interface KeyBenchSnapshot {
  keyConfig: string;
  lastAction: string;
  angle: string;
  scale: string;
}

export interface KeyBenchInstance {
  update(options: KeyBenchOptions): void;
  dispose(): void;
}

export function createKeyBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: KeyBenchSnapshot) => void,
): KeyBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  const rectM = new Rect({ left: 320, top: 200, width: 150, height: 100, fill: '#4f7cff' });
  // 红点标记 M 的中心：绕中心变换时红点不动，锚定角/锚定手柄时红点会被带走
  const centerDot = new Circle({
    left: 320,
    top: 200,
    radius: 4,
    fill: '#e11d48',
    selectable: false,
    evented: false,
  });
  stage.fabricCanvas.add(rectM, centerDot, createLabel('M（中心红点为标记）', 320, 132));

  let lastAction = '—';

  function emitSnapshot() {
    emit({
      keyConfig: `canvas: centeredScaling=${stage.fabricCanvas.centeredScaling}, uniformScaling=${stage.fabricCanvas.uniformScaling}; M: centeredRotation=${rectM.centeredRotation}（默认 true）`,
      lastAction,
      angle: `${Math.round(rectM.angle)}°`,
      scale: `${rectM.scaleX.toFixed(2)} / ${rectM.scaleY.toFixed(2)}`,
    });
  }

  const trackTransform =
    () =>
    (event: { transform?: { action?: string } }): void => {
      lastAction = event.transform?.action ?? '—';
      emitSnapshot();
    };
  stage.fabricCanvas.on('object:scaling', trackTransform());
  stage.fabricCanvas.on('object:rotating', trackTransform());

  function update(options: KeyBenchOptions) {
    stage.fabricCanvas.set({
      centeredScaling: options.centeredScale,
      uniformScaling: options.uniform,
    });
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}

// ---------------------------------------------------------------------------
// 范例 7：编程式选择——setActiveObject / discardActiveObject 与 selection 事件
// ---------------------------------------------------------------------------

export type ProgrammaticAction = 'discard' | 'selectP' | 'qrAS' | 'allAS';

export interface ProgrammaticBenchOptions {
  progAction: ProgrammaticAction;
}

export interface ProgrammaticBenchSnapshot {
  lastSelectionEvent: string;
  activeObject: string;
  activeObjects: string;
}

export interface ProgrammaticBenchInstance {
  update(options: ProgrammaticBenchOptions): void;
  dispose(): void;
}

export function createProgrammaticBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ProgrammaticBenchSnapshot) => void,
): ProgrammaticBenchInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });
  const labels = new Map<FabricObject, string>();

  const rectP = new Rect({ left: 180, top: 160, width: 110, height: 80, fill: '#4f7cff' });
  const circleQ = new Circle({ left: 340, top: 150, radius: 40, fill: '#10b981' });
  const triangleR = new Triangle({
    left: 490,
    top: 230,
    width: 100,
    height: 84,
    fill: '#f59e0b',
  });
  labels.set(rectP, 'P');
  labels.set(circleQ, 'Q');
  labels.set(triangleR, 'R');
  stage.fabricCanvas.add(
    rectP,
    circleQ,
    triangleR,
    createLabel('P', 180, 108),
    createLabel('Q', 340, 98),
    createLabel('R', 490, 178),
  );

  let lastSelectionEvent = '—';
  let lastAction: ProgrammaticAction | undefined;

  function emitSnapshot() {
    emit({
      lastSelectionEvent,
      activeObject: describeObject(stage.fabricCanvas.getActiveObject(), labels),
      activeObjects: describeList(stage.fabricCanvas.getActiveObjects(), labels),
    });
  }

  trackSelectionEvents(stage.fabricCanvas, labels, (summary) => {
    lastSelectionEvent = summary;
  }, emitSnapshot);

  function update(options: ProgrammaticBenchOptions) {
    // 控件值变化才执行一次对应 API，避免重复触发事件
    if (options.progAction === lastAction) {
      emitSnapshot();
      return;
    }
    lastAction = options.progAction;
    if (options.progAction === 'discard') {
      stage.fabricCanvas.discardActiveObject();
    } else if (options.progAction === 'selectP') {
      stage.fabricCanvas.setActiveObject(rectP);
    } else {
      // 程序化多选：把已在画布上的对象装进 ActiveSelection，再交给 setActiveObject
      const members =
        options.progAction === 'qrAS' ? [circleQ, triangleR] : [rectP, circleQ, triangleR];
      const activeSelection = new ActiveSelection(members);
      activeSelection.set('canvas', stage.fabricCanvas);
      stage.fabricCanvas.setActiveObject(activeSelection);
    }
    // setActiveObject / discardActiveObject 只改状态不重绘，程序调用后要自己刷新画面
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return { update, dispose: stage.dispose };
}
