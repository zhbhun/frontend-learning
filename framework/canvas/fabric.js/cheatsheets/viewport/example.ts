/**
 * 范例介绍：用 2 个独立画布核对 viewportTransform 的"观察矩阵"模型——
 * 1. 缩放与不动点：setZoom 等价 zoomToPoint(new Point(0, 0), z)，以视口左上角为不动点（e/f 被等比改写而非清零）；
 *    zoomToPoint(视口点, z) 让该点处的内容钉在屏幕上不动；任何缩放方式下，标记对象的场景坐标恒为 (320, 180)，
 *    视口坐标随 vpt 变化；活动对象的边框手柄保持屏幕尺寸（calcOCoords 末尾除以 vpt 缩放）。
 * 2. 平移与坐标互转：absolutePan(场景点) 把该点送到视口左上角（e = -x、f = -y）；
 *    读数给出"场景 → 视口（正乘 vpt）→ 场景（逆乘）"的闭环，与左上角场景点逐项核对。
 * 输入：缩放方式 + zoom 倍率；absolutePan 的场景点 X / Y。
 * 预期结果：vpt 矩阵、标记对象场景 / 视口坐标、左上角对应场景点等读数随操作逐项对应。
 * 阅读主线：2 个 create* 函数各对应正文一个小节，apply/update 展示对应公开 API 的最小用法。
 */
import { Canvas, Circle, Point, Rect, util } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };

/** 标记对象的场景中心：网格、读数都以它为参照物 */
const MARKER_CENTER = new Point(320, 180);
/** 范例 1 的基准平移：让 vpt 的 e/f 从非零状态出发，三种缩放方式的不动点差异才能在读数里现形 */
const PAN_BASE = new Point(80, 40);

/** 共享的舞台装配：创建交互画布并跟随共享舞台尺寸；dispose 释放观察器与画布 */
function setupStage(
  canvasEl: HTMLCanvasElement,
  replay: () => void,
) {
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });
  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () => {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    fabricCanvas.setDimensions({ width, height });
    // 视口中心等读数依赖画布尺寸，尺寸变化后重放当前状态
    replay();
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

/**
 * 场景参照网格：细矩形拼成网格线（Line 类在 v7 已标 deprecated），
 * 全部不可选、不响应事件，让读者专注 vpt 变化带来的观察效果。
 * 网格覆盖场景 0..1280 × 0..720，坐标轴（x=0 / y=0）用更深的颜色。
 */
function createGrid(): Rect[] {
  const guides: Rect[] = [];
  for (let x = 0; x <= 1280; x += 80) {
    guides.push(
      new Rect({
        left: x,
        top: 360,
        width: 1,
        height: 720,
        fill: x === 0 ? '#94a3b8' : '#dbe3ee',
        selectable: false,
        evented: false,
      }),
    );
  }
  for (let y = 0; y <= 720; y += 60) {
    guides.push(
      new Rect({
        left: 640,
        top: y,
        width: 1280,
        height: 1,
        fill: y === 0 ? '#94a3b8' : '#dbe3ee',
        selectable: false,
        evented: false,
      }),
    );
  }
  return guides;
}

/** 场景原点标记：红色小圆钉在场景 (0, 0)，缩放平移时它在屏幕上移动、场景读数不动 */
function createOriginDot() {
  return new Circle({
    radius: 4,
    fill: '#e11d48',
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
  });
}

// ---------------------------------------------------------------------------
// 范例 1：缩放与不动点——setZoom 绕左上角，zoomToPoint 绕指定视口点
// ---------------------------------------------------------------------------

export type ZoomMode = 'setZoom' | 'center' | 'marker';

export interface ZoomPivotOptions {
  zoomMode: ZoomMode;
  zoomLevel: number;
}

export interface ZoomPivotSnapshot {
  mode: string;
  vpt: string;
  zoom: string;
  markerScene: string;
  markerViewport: string;
  topLeftScene: string;
}

export interface ZoomPivotInstance {
  update(options: ZoomPivotOptions): void;
  dispose(): void;
}

const ZOOM_MODE_LABELS: Record<ZoomMode, string> = {
  setZoom: 'setZoom(左上角不动)',
  center: 'zoomToPoint(视口中心)',
  marker: 'zoomToPoint(标记点)',
};

export function createZoomPivot(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ZoomPivotSnapshot) => void,
): ZoomPivotInstance {
  let current: ZoomPivotOptions = { zoomMode: 'marker', zoomLevel: 1.5 };

  const marker = new Rect({
    left: MARKER_CENTER.x,
    top: MARKER_CENTER.y,
    width: 120,
    height: 72,
    fill: '#4f7cff',
  });

  const stage = setupStage(canvasEl, () => apply(current));
  stage.fabricCanvas.add(...createGrid(), createOriginDot(), marker);

  function apply(options: ZoomPivotOptions) {
    const { fabricCanvas } = stage;
    // 先保持标记为活动对象：setViewportTransform 只自动刷新活动对象的 oCoords，
    // 之后每次改 vpt 它的边框手柄都会跟随（这是正文断言的直接证据）
    fabricCanvas.setActiveObject(marker);
    // 每次从同一基准态出发：恒等 vpt → 基准平移 → 按缩放方式施加
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.absolutePan(PAN_BASE);
    if (options.zoomMode === 'setZoom') {
      // setZoom = zoomToPoint(new Point(0, 0), z)：视口左上角是不动点，
      // e/f 被改写成 -panX×z、-panY×z 而不是清零（对比读数「左上角对应场景点」）
      fabricCanvas.setZoom(options.zoomLevel);
    } else if (options.zoomMode === 'center') {
      // getCenterPoint() 返回视口平面的画布中心 (width/2, height/2)，
      // 正是 zoomToPoint 要求的视口坐标；不要与返回场景坐标的 getVpCenter() 混淆
      fabricCanvas.zoomToPoint(
        fabricCanvas.getCenterPoint(),
        options.zoomLevel,
      );
    } else {
      // 不动点取标记当前在屏幕上的位置：场景中心先正乘 vpt 换算成视口坐标，
      // 再交给 zoomToPoint——缩放后标记钉在原地，网格以它为中心伸缩
      const markerVp = marker
        .getCenterPoint()
        .transform(fabricCanvas.viewportTransform);
      fabricCanvas.zoomToPoint(markerVp, options.zoomLevel);
    }
    emitSnapshot(options);
  }

  function emitSnapshot(options: ZoomPivotOptions) {
    const { fabricCanvas } = stage;
    const vpt = fabricCanvas.viewportTransform;
    // 场景坐标经 vpt 正乘得视口坐标：矩形中心永远在场景 (320, 180)
    const markerVp = marker.getCenterPoint().transform(vpt);
    // 视口 (0, 0) 逆乘 vpt：当前屏幕左上角对着哪个场景点（区分三种方式的关键读数）
    const topLeft = new Point(0, 0).transform(util.invertTransform(vpt));
    const center = marker.getCenterPoint();
    emit({
      mode: ZOOM_MODE_LABELS[options.zoomMode],
      vpt: formatMatrix(vpt),
      zoom: fabricCanvas.getZoom().toFixed(2),
      markerScene: `${Math.round(center.x)}, ${Math.round(center.y)}（恒定）`,
      markerViewport: `${markerVp.x.toFixed(1)}, ${markerVp.y.toFixed(1)}`,
      topLeftScene: `${topLeft.x.toFixed(1)}, ${topLeft.y.toFixed(1)}`,
    });
  }

  return {
    update(options) {
      current = options;
      apply(options);
    },
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 2：平移与坐标互转——absolutePan 语义与场景/视口往返闭环
// ---------------------------------------------------------------------------

export interface PanConvertOptions {
  panX: number;
  panY: number;
}

export interface PanConvertSnapshot {
  vpt: string;
  topLeftScene: string;
  markerScene: string;
  markerViewport: string;
  roundTrip: string;
}

export interface PanConvertInstance {
  update(options: PanConvertOptions): void;
  dispose(): void;
}

export function createPanConvert(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: PanConvertSnapshot) => void,
): PanConvertInstance {
  let current: PanConvertOptions = { panX: 160, panY: 90 };

  const marker = new Rect({
    left: MARKER_CENTER.x,
    top: MARKER_CENTER.y,
    width: 120,
    height: 72,
    fill: '#4f7cff',
    selectable: false,
    evented: false,
  });

  const stage = setupStage(canvasEl, () => apply(current));
  stage.fabricCanvas.add(...createGrid(), createOriginDot(), marker);

  function apply(options: PanConvertOptions) {
    // absolutePan(场景点)：把该场景点送到视口左上角 → vpt = [1, 0, 0, 1, -panX, -panY]；
    // 相对平移用 relativePan(Δ)：在当前 e/f 上加 Δ
    stage.fabricCanvas.absolutePan(new Point(options.panX, options.panY));
    emitSnapshot();
  }

  function emitSnapshot() {
    const { fabricCanvas } = stage;
    const vpt = fabricCanvas.viewportTransform;
    const sceneCenter = marker.getCenterPoint(); // 场景坐标：不随 vpt 变
    const viewportCenter = sceneCenter.transform(vpt); // 视口坐标 = 场景 × vpt
    // 逆算闭环：视口坐标再逆乘 vpt，应精确回到场景坐标（正文双向公式的直接证据）
    const roundTrip = viewportCenter.transform(util.invertTransform(vpt));
    const topLeft = new Point(0, 0).transform(util.invertTransform(vpt));
    emit({
      vpt: formatMatrix(vpt),
      topLeftScene: `${topLeft.x.toFixed(1)}, ${topLeft.y.toFixed(1)}（= 控件值）`,
      markerScene: `${Math.round(sceneCenter.x)}, ${Math.round(sceneCenter.y)}（恒定）`,
      markerViewport: `${viewportCenter.x.toFixed(1)}, ${viewportCenter.y.toFixed(1)}`,
      roundTrip: `${roundTrip.x.toFixed(1)}, ${roundTrip.y.toFixed(1)}（回到场景）`,
    });
  }

  return {
    update(options) {
      current = options;
      apply(options);
    },
    dispose: stage.dispose,
  };
}
