/**
 * 范例介绍：用 4 个独立画布核对 Fabric 对象的变换属性模型——
 * 1. 锚点与 origin：left/top 是锚点坐标，originX/originY 不只解释定位，也决定旋转支点；
 *    set('angle') 绕锚点转，rotate() 绕中心转并改写 left/top；
 * 2. 缩放与倾斜：scaleX/scaleY 是乘在 width/height 上的变换系数（width/height 永不被改），
 *    skewX 沿轴剪切只扩大包围盒；scale()/scaleToWidth() 等比缩放且内部已刷新缓存；
 * 3. 翻转与矩阵：flipX: true 与 scaleX: -1 的 calcOwnMatrix() 逐元相同，qrDecompose 分解不出 flip；
 * 4. setCoords 缓存：getBoundingRect()/containsPoint() 读 aCoords 缓存，程序 set() 后不刷新就读到旧值。
 * 输入：每个范例各自由 Controls 提供（origin、角度与设置方式、scale/skew/目标宽、镜像方式、left 与刷新开关）。
 * 预期结果：画面变化与 readout 读数（锚点/中心恒定性、矩阵逐元相等、陈旧包围盒）逐项对应。
 * 阅读主线：4 个 create* 函数各对应正文一个小节，update() 展示对应公开 API 的最小用法。
 */
import { Canvas, Circle, Polygon, Rect, Point, util } from 'fabric';
import type { XY } from 'fabric';
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

/** 把矩阵读数统一成 6 元数组文本，便于逐元对照 */
function formatMatrix(matrix: readonly number[]) {
  return `[${matrix.map((value) => Math.round(value * 100) / 100).join(', ')}]`;
}

// ---------------------------------------------------------------------------
// 范例 1：锚点与 origin——set('angle') 绕锚点旋转，rotate() 绕中心旋转
// ---------------------------------------------------------------------------

export interface AnchorPivotOptions {
  pivotOriginX: 'center' | 'left';
  pivotOriginY: 'center' | 'top';
  pivotAngle: number;
  pivotMode: 'set' | 'rotate';
}

export interface AnchorPivotSnapshot {
  origin: string;
  mode: string;
  leftTop: string;
  anchorPoint: string;
  centerPoint: string;
}

export interface AnchorPivotInstance {
  update(options: AnchorPivotOptions): void;
  dispose(): void;
}

/** 演示锚点固定在画布 (320, 180)：灰圈标记锚点基准位置，红点跟随当前 origin 语义下的锚点 */
export function createAnchorPivot(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: AnchorPivotSnapshot) => void,
): AnchorPivotInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  const ANCHOR_BASE = new Point(320, 180);
  const rect = new Rect({
    left: ANCHOR_BASE.x,
    top: ANCHOR_BASE.y,
    width: 150,
    height: 100,
    fill: '#4f7cff',
  });
  const baseRing = new Circle({
    radius: 9,
    fill: null,
    stroke: '#94a3b8',
    strokeWidth: 2,
    left: ANCHOR_BASE.x,
    top: ANCHOR_BASE.y,
  });
  const anchorDot = new Circle({ radius: 4, fill: '#e11d48' });
  stage.fabricCanvas.add(baseRing, rect, anchorDot);

  function emitSnapshot(mode: AnchorPivotOptions['pivotMode']) {
    // getPositionByOrigin 直接给出“当前 origin 语义下锚点”的画布坐标
    const anchorPos = rect.getPositionByOrigin(rect.originX, rect.originY);
    const center = rect.getCenterPoint();
    emit({
      origin: `${rect.originX} / ${rect.originY}`,
      mode: mode === 'set' ? "set('angle')" : 'rotate()',
      leftTop: `${Math.round(rect.left)}, ${Math.round(rect.top)}`,
      anchorPoint: `${Math.round(anchorPos.x)}, ${Math.round(anchorPos.y)}`,
      centerPoint: `${Math.round(center.x)}, ${Math.round(center.y)}`,
    });
  }

  function update(options: AnchorPivotOptions) {
    // 每次从同一基准态出发：锚点固定在 (320, 180)，角度清零，再按设置方式施加角度
    rect.set({
      left: ANCHOR_BASE.x,
      top: ANCHOR_BASE.y,
      originX: options.pivotOriginX,
      originY: options.pivotOriginY,
      angle: 0,
    });
    if (options.pivotMode === 'set') {
      // set('angle') 只改角度：对象绕 origin 锚点旋转，left/top 数值不动
      rect.set('angle', options.pivotAngle);
    } else {
      // rotate() 绕中心旋转：内部重排 left/top，使中心保持在旋转前的位置
      rect.rotate(options.pivotAngle);
    }
    rect.setCoords();
    const anchorPos = rect.getPositionByOrigin(rect.originX, rect.originY);
    anchorDot.set({ left: anchorPos.x, top: anchorPos.y });
    anchorDot.setCoords();
    // set()/rotate() 只改属性与缓存，画面刷新仍要 requestRenderAll（见渲染模型一课）
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot(options.pivotMode);
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 2：缩放与倾斜——width/height 恒定，scale/skew 只改变换与实际占位
// ---------------------------------------------------------------------------

export interface ScaleSkewOptions {
  scaleLevel: number;
  skewDeg: number;
  fitWidth: number;
}

export interface ScaleSkewSnapshot {
  size: string;
  scale: string;
  scaledSize: string;
  boundingBox: string;
}

export interface ScaleSkewInstance {
  update(options: ScaleSkewOptions): void;
  dispose(): void;
}

export function createScaleSkew(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ScaleSkewSnapshot) => void,
): ScaleSkewInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
    rect.set({ left: width / 2, top: height / 2 });
  });

  const rect = new Rect({
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    width: 100,
    height: 60,
    fill: '#4f7cff',
  });
  stage.fabricCanvas.add(rect);

  let lastFitWidth = -1;

  function emitSnapshot() {
    const box = rect.getBoundingRect();
    emit({
      // width/height 是“原始尺寸”，scale 与 skew 都不会改写它们
      size: `${Math.round(rect.width)}×${Math.round(rect.height)}`,
      scale: `${rect.scaleX.toFixed(2)} / ${rect.scaleY.toFixed(2)}`,
      scaledSize: `${rect.getScaledWidth().toFixed(1)}×${rect.getScaledHeight().toFixed(1)}`,
      boundingBox: `${box.left.toFixed(1)}, ${box.top.toFixed(1)} → ${box.width.toFixed(1)}×${box.height.toFixed(1)}`,
    });
  }

  function update(options: ScaleSkewOptions) {
    // 控件值直接映射变换属性：width/height 保持 100×60 不动
    rect.set({
      scaleX: options.scaleLevel,
      scaleY: 1,
      skewX: options.skewDeg,
      skewY: 0,
      angle: 0,
    });
    // 先刷新缓存再 scaleToWidth：它的换算因子读 getBoundingRect()（缓存值），
    // 混用陈旧包围盒会算错等比系数
    rect.setCoords();
    if (options.fitWidth !== lastFitWidth) {
      // scaleToWidth 等比缩放（scaleX = scaleY），按包围盒口径换算，内部已 setCoords
      rect.scaleToWidth(options.fitWidth);
      lastFitWidth = options.fitWidth;
    }
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 3：翻转与变换矩阵——flipX 与负 scaleX 矩阵逐元相同，分解表达不了 flip
// ---------------------------------------------------------------------------

export type MirrorMode = 'none' | 'flipX' | 'negScaleX';

export interface FlipMatrixOptions {
  mirrorMode: MirrorMode;
}

export interface FlipMatrixSnapshot {
  mirrorMode: string;
  ownMatrix: string;
  fullMatrix: string;
  decompose: string;
}

export interface FlipMatrixInstance {
  update(options: FlipMatrixOptions): void;
  dispose(): void;
}

/** 朝右的不对称箭头：镜像后箭头方向翻转，视觉差异一目了然 */
const ARROW_POINTS: XY[] = [
  { x: -70, y: -28 },
  { x: 30, y: -28 },
  { x: 30, y: -52 },
  { x: 80, y: 0 },
  { x: 30, y: 52 },
  { x: 30, y: 28 },
  { x: -70, y: 28 },
];

const MIRROR_LABELS: Record<MirrorMode, string> = {
  none: '无镜像',
  flipX: 'flipX: true',
  negScaleX: 'scaleX: -1',
};

export function createFlipMatrix(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: FlipMatrixSnapshot) => void,
): FlipMatrixInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  const arrow = new Polygon(ARROW_POINTS, {
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
    fill: '#4f7cff',
  });
  const centerRing = new Circle({
    radius: 6,
    fill: null,
    stroke: '#94a3b8',
    strokeWidth: 2,
    left: STAGE_CENTER.x,
    top: STAGE_CENTER.y,
  });
  stage.fabricCanvas.add(centerRing, arrow);

  function emitSnapshot(mode: MirrorMode) {
    const own = arrow.calcOwnMatrix();
    // 无父级时 calcTransformMatrix 与 calcOwnMatrix 相同；有 Group 时为父矩阵 × 自身矩阵
    const full = arrow.calcTransformMatrix();
    const decomposed = util.qrDecompose(own);
    emit({
      mirrorMode: MIRROR_LABELS[mode],
      ownMatrix: formatMatrix(own),
      fullMatrix: formatMatrix(full),
      // 镜像矩阵分解不出 flip：规范成 angle 180° + 负 scaleY
      decompose: `angle ${Math.round(decomposed.angle)}°, scaleX ${decomposed.scaleX.toFixed(2)}, scaleY ${decomposed.scaleY.toFixed(2)}`,
    });
  }

  function update(options: FlipMatrixOptions) {
    // 每次从基准态出发，再按镜像方式施加：flip 与负 scale 是两种属性表达
    arrow.set({ flipX: false, scaleX: 1, angle: 0 });
    if (options.mirrorMode === 'flipX') {
      arrow.set('flipX', true);
    }
    if (options.mirrorMode === 'negScaleX') {
      arrow.set('scaleX', -1);
    }
    arrow.setCoords();
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot(options.mirrorMode);
  }

  return {
    update,
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 4：setCoords 与坐标缓存——不刷新时 getBoundingRect/containsPoint 读旧值
// ---------------------------------------------------------------------------

export interface CoordsCacheOptions {
  cacheLeft: number;
  cacheRefresh: boolean;
}

export interface CoordsCacheSnapshot {
  bboxLeft: number;
  bboxSize: string;
  containsProbe: boolean;
  aCoordsTlX: number;
}

export interface CoordsCacheInstance {
  update(options: CoordsCacheOptions): void;
  dispose(): void;
}

export function createCoordsCache(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CoordsCacheSnapshot) => void,
): CoordsCacheInstance {
  const stage = setupStage(canvasEl, (width, height) => {
    stage.fabricCanvas.setDimensions({ width, height });
  });

  /** 固定探测点：把对象 left 拖到 330 时它的中心恰好压在探测点上 */
  const PROBE = new Point(330, 180);
  const rect = new Rect({
    left: 130,
    top: 180,
    width: 100,
    height: 100,
    fill: '#4f7cff',
  });
  const probeRing = new Circle({
    radius: 9,
    fill: null,
    stroke: '#e11d48',
    strokeWidth: 2,
    left: PROBE.x,
    top: PROBE.y,
  });
  // 探测圈放在矩形上层：对象拖到 330 时中心压住它，肉眼可核对
  stage.fabricCanvas.add(rect, probeRing);

  function emitSnapshot() {
    const box = rect.getBoundingRect();
    emit({
      bboxLeft: Math.round(box.left),
      bboxSize: `${Math.round(box.width)}×${Math.round(box.height)}`,
      containsProbe: rect.containsPoint(PROBE),
      aCoordsTlX: Math.round(rect.aCoords.tl.x),
    });
  }

  function update(options: CoordsCacheOptions) {
    rect.set('left', options.cacheLeft);
    // 只在读者打开开关时刷新缓存：下面的读数全部走公开 API，读的是 aCoords 缓存
    if (options.cacheRefresh) {
      rect.setCoords();
    }
    stage.fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  return {
    update,
    dispose: stage.dispose,
  };
}
