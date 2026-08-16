/**
 * 范例介绍：用 7 个独立画布核对 Fabric 基础图形的创建模型——
 * 1. 构造 = 一个 options 对象：形状参数与通用属性一次传入，canvas.add() 后立即可见；
 * 2. left/top 的落点由 originX/originY 解释：v7 起默认 'center'，改 origin 会让对象绕同一锚点重摆；
 * 3. 各图形类的尺寸来源不同：Rect/Triangle 直接给 width/height，Circle/Ellipse 由 radius、rx/ry 派生，
 *    Line 由两端点差派生，Polyline/Polygon 由点集包围盒派生。
 * 输入：每个范例各自由 Controls 提供（图形类型、origin、rx/ry、radius、角度、stroke 开关、闭合开关等）。
 * 预期结果：画面变化与 readout 读数（尺寸派生、origin 语义、stroke 可见性、闭合差异）逐项对应。
 * 阅读主线：7 个 create* 函数各对应正文一个小节，update() 展示对应公开 API 的最小用法。
 */
import {
  Canvas,
  Circle,
  Ellipse,
  Line,
  Polygon,
  Polyline,
  Rect,
  Triangle,
} from 'fabric';
import type { FabricObject, XY } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const STAGE_CENTER = { x: INITIAL_SIZE.width / 2, y: INITIAL_SIZE.height / 2 };

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

/** 把派生读数统一成定宽文本，便于 readout 对齐 */
function joinSize(object: FabricObject) {
  return `${Math.round(object.width)}×${Math.round(object.height)}`;
}

// ---------------------------------------------------------------------------
// 范例 1：构造与上画布——options 单对象 + canvas.add + 通用属性即时生效
// ---------------------------------------------------------------------------

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'polyline'
  | 'polygon';

export interface ShapeGalleryOptions {
  shapeKind: ShapeKind;
  left: number;
  top: number;
  fill: string;
  opacity: number;
  visible: boolean;
}

export interface ShapeGallerySnapshot {
  objectCount: number;
  shapeSize: string;
  objectLeft: number;
  objectTop: number;
  objectFill: string;
}

export interface ShapeGalleryInstance {
  update(options: ShapeGalleryOptions): void;
  dispose(): void;
}

const CHEVRON_POINTS: XY[] = [
  { x: -130, y: -35 },
  { x: -45, y: 35 },
  { x: 40, y: -35 },
  { x: 125, y: 35 },
];

/** 每种图形只给“形状参数”，尺寸来源各不相同；通用属性留给 update() 演示 */
function createShape(kind: ShapeKind, fill: string): FabricObject {
  switch (kind) {
    case 'rect':
      return new Rect({ width: 130, height: 95, fill });
    case 'circle':
      return new Circle({ radius: 62, fill });
    case 'ellipse':
      return new Ellipse({ rx: 75, ry: 48, fill });
    case 'triangle':
      return new Triangle({ width: 130, height: 105, fill });
    case 'line':
      // Line 只渲染 stroke：这里把填充色映射到描边，否则线段不可见
      return new Line([-75, -48, 75, 48], { stroke: fill, strokeWidth: 4 });
    case 'polyline':
      return new Polyline(CHEVRON_POINTS, { stroke: fill, strokeWidth: 4 });
    case 'polygon':
      return new Polygon(CHEVRON_POINTS, { fill, stroke: fill, strokeWidth: 4 });
  }
}

export function createShapeGallery(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ShapeGallerySnapshot) => void,
): ShapeGalleryInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    // 画布尺寸变化只重设画布，对象位置交给 Controls 的 left/top
    stage.fabricCanvas.setDimensions({ width, height });
  });

  let currentKind: ShapeKind | undefined;
  let current: FabricObject | undefined;

  function emitSnapshot() {
    if (!current) {
      return;
    }
    emit({
      objectCount: stage.fabricCanvas.getObjects().length,
      shapeSize: joinSize(current),
      objectLeft: Math.round(current.left),
      objectTop: Math.round(current.top),
      objectFill: String(current.fill),
    });
  }

  function update(options: ShapeGalleryOptions) {
    if (options.shapeKind !== currentKind) {
      // 换图形 = 移除旧对象、按各自的形状参数新建、再 add 上画布
      if (current) {
        stage.fabricCanvas.remove(current);
      }
      currentKind = options.shapeKind;
      current = createShape(options.shapeKind, options.fill);
      stage.fabricCanvas.add(current);
    }
    if (!current) {
      return;
    }
    // 通用属性走同一套 set()，与写在构造 options 里等价
    current.set({
      left: options.left,
      top: options.top,
      opacity: options.opacity,
      visible: options.visible,
    });
    if (currentKind === 'line') {
      current.set('stroke', options.fill);
    } else {
      current.set('fill', options.fill);
    }
    // set() 改 left/top 不会刷新命中检测用的 aCoords 缓存，补 setCoords() 保持点选位置正确
    current.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 2：origin 定位语义——同一 left/top，切 originX/originY 对象绕锚点重摆
// ---------------------------------------------------------------------------

export interface OriginAnchorOptions {
  anchorOriginX: 'center' | 'left';
  anchorOriginY: 'center' | 'top';
  anchorLeft: number;
  anchorTop: number;
}

export interface OriginAnchorSnapshot {
  originX: string;
  originY: string;
  objectLeft: number;
  objectTop: number;
  centerPoint: string;
}

export interface OriginAnchorInstance {
  update(options: OriginAnchorOptions): void;
  dispose(): void;
}

export function createOriginAnchor(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: OriginAnchorSnapshot) => void,
): OriginAnchorInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  const rect = new Rect({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    width: 150,
    height: 100,
    fill: '#4f7cff',
  });
  // 红点标记 (left, top) 锚点本身：它不属于被演示的定位语义，只是视觉参照
  const anchor = new Circle({ radius: 4, fill: '#e11d48' });
  stage.fabricCanvas.add(rect, anchor);

  function emitSnapshot() {
    const center = rect.getCenterPoint();
    emit({
      originX: rect.originX,
      originY: rect.originY,
      objectLeft: Math.round(rect.left),
      objectTop: Math.round(rect.top),
      centerPoint: `${Math.round(center.x)}, ${Math.round(center.y)}`,
    });
  }

  function update(options: OriginAnchorOptions) {
    // left/top 数值不变，只切 origin：矩形绕红点重摆，是 origin 语义的直接证据
    rect.set({
      originX: options.anchorOriginX,
      originY: options.anchorOriginY,
      left: options.anchorLeft,
      top: options.anchorTop,
    });
    anchor.set({ left: options.anchorLeft, top: options.anchorTop });
    rect.setCoords();
    anchor.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 3：Rect 圆角——rx/ry 默认 0，构造只给其一时另一个取同值
// ---------------------------------------------------------------------------

export interface RectCornerOptions {
  rectRx: number;
  rectRy: number;
}

export interface RectCornerSnapshot {
  rx: number;
  ry: number;
  size: string;
}

export interface RectCornerInstance {
  update(options: RectCornerOptions): void;
  dispose(): void;
}

export function createRectCorners(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: RectCornerSnapshot) => void,
): RectCornerInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    rect.set({ left: width / 2, top: height / 2 });
  });

  const rect = new Rect({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    width: 210,
    height: 140,
    rx: 30, // 只传 rx：构造时 ry 未给，取 rx 的值（_initRxRy 互补）
    fill: '#4f7cff',
  });
  stage.fabricCanvas.add(rect);

  function emitSnapshot() {
    emit({
      rx: rect.rx,
      ry: rect.ry,
      size: joinSize(rect),
    });
  }

  function update(options: RectCornerOptions) {
    rect.set({ rx: options.rectRx, ry: options.rectRy });
    rect.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 4：Circle——radius 是唯一尺寸输入，width/height = 2 × radius 派生
// ---------------------------------------------------------------------------

export interface CircleRadiusOptions {
  circleRadius: number;
  startAngle: number;
  endAngle: number;
}

export interface CircleRadiusSnapshot {
  radius: number;
  width: number;
  height: number;
  startAngle: number;
  endAngle: number;
}

export interface CircleRadiusInstance {
  update(options: CircleRadiusOptions): void;
  dispose(): void;
}

export function createCircleRadius(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CircleRadiusSnapshot) => void,
): CircleRadiusInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    circle.set({ left: width / 2, top: height / 2 });
  });

  const circle = new Circle({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    radius: 62,
    fill: '#4f7cff',
  });
  stage.fabricCanvas.add(circle);

  function emitSnapshot() {
    emit({
      radius: circle.radius,
      width: Math.round(circle.width),
      height: Math.round(circle.height),
      startAngle: circle.startAngle,
      endAngle: circle.endAngle,
    });
  }

  function update(options: CircleRadiusOptions) {
    // set('radius') 内部同步 width/height = radius × 2；角度切段由 start/end 决定
    circle.set({
      radius: options.circleRadius,
      startAngle: options.startAngle,
      endAngle: options.endAngle,
    });
    circle.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 5：Ellipse——rx/ry 是两个半径，width = 2×rx、height = 2×ry 派生
// ---------------------------------------------------------------------------

export interface EllipseRadiiOptions {
  ellipseRx: number;
  ellipseRy: number;
}

export interface EllipseRadiiSnapshot {
  rx: number;
  ry: number;
  width: number;
  height: number;
}

export interface EllipseRadiiInstance {
  update(options: EllipseRadiiOptions): void;
  dispose(): void;
}

export function createEllipseRadii(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: EllipseRadiiSnapshot) => void,
): EllipseRadiiInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    ellipse.set({ left: width / 2, top: height / 2 });
  });

  const ellipse = new Ellipse({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    rx: 80,
    ry: 50,
    fill: '#4f7cff',
  });
  stage.fabricCanvas.add(ellipse);

  function emitSnapshot() {
    emit({
      rx: ellipse.rx,
      ry: ellipse.ry,
      width: Math.round(ellipse.width),
      height: Math.round(ellipse.height),
    });
  }

  function update(options: EllipseRadiiOptions) {
    ellipse.set({ rx: options.ellipseRx, ry: options.ellipseRy });
    ellipse.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 6：Line——端点数组决定宽高与位置，只有 stroke 决定可见性
// ---------------------------------------------------------------------------

export interface LineStrokeOptions {
  lineStroked: boolean;
  lineX2: number;
}

export interface LineStrokeSnapshot {
  endpoints: string;
  width: number;
  height: number;
  position: string;
  strokeState: string;
}

export interface LineStrokeInstance {
  update(options: LineStrokeOptions): void;
  dispose(): void;
}

const LINE_START = { x: 90, y: 100 };

export function createLineStroke(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: LineStrokeSnapshot) => void,
): LineStrokeInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  // 不传 left/top：位置默认取两端点包围盒的中心，这是 Line 的派生行为
  const line = new Line([LINE_START.x, LINE_START.y, 320, 220], {
    stroke: '#4f7cff',
    strokeWidth: 4,
  });
  stage.fabricCanvas.add(line);

  function emitSnapshot() {
    emit({
      endpoints: `(${line.x1}, ${line.y1}) → (${line.x2}, ${line.y2})`,
      width: Math.round(line.width),
      height: Math.round(line.height),
      position: `${Math.round(line.left)}, ${Math.round(line.top)}`,
      strokeState: line.stroke ? String(line.stroke) : 'null（不渲染）',
    });
  }

  function update(options: LineStrokeOptions) {
    // set('x2') 触发内部重算宽高与位置；stroke 为 null 时线段不渲染
    line.set('stroke', options.lineStroked ? '#4f7cff' : null);
    line.set('x2', options.lineX2);
    line.setCoords();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 7：Polyline 与 Polygon——点集包围盒派生尺寸，Polygon 自动闭合轮廓
// ---------------------------------------------------------------------------

export interface PolyFamilyOptions {
  polyClosed: boolean;
  polyPreset: 'chevron' | 'star';
}

export interface PolyFamilySnapshot {
  polyType: string;
  pointCount: number;
  size: string;
}

export interface PolyFamilyInstance {
  update(options: PolyFamilyOptions): void;
  dispose(): void;
}

const STAR_POINTS: XY[] = [
  { x: 0, y: -95 },
  { x: 12.4, y: -38 },
  { x: 90.5, y: -29.4 },
  { x: 40, y: 0 },
  { x: 55.8, y: 76.9 },
  { x: 12.4, y: 38 },
  { x: -55.8, y: 76.9 },
  { x: -32.4, y: 23.5 },
  { x: -90.5, y: -29.4 },
  { x: -32.4, y: -23.5 },
];

const POLY_PRESETS: Record<PolyFamilyOptions['polyPreset'], XY[]> = {
  chevron: CHEVRON_POINTS,
  star: STAR_POINTS,
};

export function createPolyFamily(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: PolyFamilySnapshot) => void,
): PolyFamilyInstance {
  let current: FabricObject | undefined;
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    current?.set({ left: width / 2, top: height / 2 });
  });

  // 开放折线只有弦内填充（缺口可见），闭合多边形填充完整——两态对照即闭合差异
  function makePoly(closed: boolean, preset: PolyFamilyOptions['polyPreset']) {
    const points = POLY_PRESETS[preset];
    const options = {
      left: STAGE_CENTER.x,
      top: STAGE_CENTER.y,
      fill: '#a8bdff',
      stroke: '#3554d1',
      strokeWidth: 4,
    };
    return closed ? new Polygon(points, options) : new Polyline(points, options);
  }

  let currentState: {
    closed: boolean;
    preset: PolyFamilyOptions['polyPreset'];
  } = { closed: false, preset: 'chevron' };

  function emitSnapshot() {
    if (!current) {
      return;
    }
    emit({
      polyType: (current.constructor as typeof Polyline).type,
      pointCount: (current as Polyline).points.length,
      size: joinSize(current),
    });
  }

  function update(options: PolyFamilyOptions) {
    if (
      options.polyClosed !== currentState.closed ||
      options.polyPreset !== currentState.preset
    ) {
      // 切闭合态/点集 = 换对象：Polyline 与 Polygon 是两个类
      if (current) {
        stage.fabricCanvas.remove(current);
      }
      currentState = { closed: options.polyClosed, preset: options.polyPreset };
      current = makePoly(options.polyClosed, options.polyPreset);
      stage.fabricCanvas.add(current);
    }
    current?.setCoords();
    emitSnapshot();
  }

  update({ polyClosed: false, polyPreset: 'chevron' });

  return {
    update,
    dispose: stage.dispose,
  };
}
