/**
 * 演示内容：视图控制——如何平移（move）与缩放（zoom）整个画布视图，而不是变换单个元素。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           引入 @leafer-in/view，获得 leafer.zoom('fit' | 'in' | 'out' | number) 这个视图缩放方法。
 *           本课公开输入：scale（视图缩放比例）、pan（是否允许拖拽平移）、wheelZoom（是否允许滚轮缩放）、
 *           action（一次性视图动作：无 / 适应视图 fit / 还原 1:1）。
 * 主要操作：new Leafer({ view: canvas, width, height, zoom }) 建一个「设计画布」，
 *           画一层淡色网格 + 若干彩色图形作为需要浏览的内容。
 *           视图变换统一落在 leafer.zoomLayer 上（x/y/scaleX/scaleY）：
 *             - 程序化缩放用 leafer.zoom(scale) / leafer.zoom('fit')，引擎自动算偏移并按 zoom.min/max 钳制；
 *             - 拖拽平移 = 直接累加 zoomLayer.x/y；滚轮缩放 = 以光标为中心改 zoomLayer.scaleX/Y（手算偏移）。
 *           「拖拽平移」「滚轮缩放」两个开关（current.pan / current.wheelZoom）控制 handler 是否响应，
 *           同时写回 leafer.config.move / wheel 让外部读取的 config 与实际行为一致。
 *           syncReadout 把当前 scale 与视口偏移 (x,y) 派发到 readout，平移 / 缩放 / 滑块任一变化都同步。
 * 预期结果：拖 scale 滑块 → 视图绕画布中心缩放，readout 缩放值同步；
 *           打开「拖拽平移」→ 按住拖动可平移视图，readout 偏移变化；
 *           打开「滚轮缩放」→ 滚轮以光标为中心缩放视图；
 *           选择「适应视图」→ 自动把所有内容居中适配到画布。
 * 阅读主线：createViewScene → 内容层（网格 + 图形 + 内容原点标记）→ 视图 handler（拖拽 / 滚轮 → zoomLayer）
 *           → update（scale 滑块 + fit 动作 + 开关）→ syncReadout → dispose。
 */
import { Leafer, Rect, Line, Text, Ellipse, Path } from 'leafer-ui';
import '@leafer-in/view';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ViewAction = 'none' | 'fit' | 'reset';

export interface ViewControlOptions {
  scale: number;
  pan: boolean;
  wheelZoom: boolean;
  action: ViewAction;
}

export interface ViewControlSnapshot {
  /** 当前视图缩放（zoomLayer.scaleX，与 scaleY 一致）。 */
  scale: number;
  /** 视口在 X 方向的偏移（zoomLayer.x）。 */
  offsetX: number;
  /** 视口在 Y 方向的偏移（zoomLayer.y）。 */
  offsetY: number;
  /** 是否允许拖拽平移。 */
  pan: boolean;
  /** 是否允许滚轮缩放。 */
  wheelZoom: boolean;
}

export interface ViewControlInstance {
  update(options: ViewControlOptions): void;
  dispose(): void;
}

// 内容世界的尺寸：网格与图形分布在这个范围内，用来演示「视图在内容上移动 / 缩放」。
const WORLD_W = 880;
const WORLD_H = 540;
// 内容相对画布的留白偏移，给读数与边框留出空间。
const PAD_X = 36;
const PAD_Y = 36;
// 滚轮每格带来的缩放因子（与官方 wheel.zoomSpeed 默认 0.5 量级一致）。
const WHEEL_FACTOR = 0.15;
// 视图缩放上下限，与 zoom.min / max 对齐，保证直接改 zoomLayer 时也受同样约束。
const SCALE_MIN = 0.25;
const SCALE_MAX = 4;

// 生成淡色网格的 SVG 路径：每 80 一条线，作为平移 / 缩放时的参照。
function gridPath(width: number, height: number, step = 80): string {
  const d: string[] = [];
  for (let x = 0; x <= width; x += step) d.push(`M ${x} 0 L ${x} ${height}`);
  for (let y = 0; y <= height; y += step) d.push(`M 0 ${y} L ${width} ${y}`);
  return d.join(' ');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createViewScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ViewControlSnapshot) => void,
): ViewControlInstance {
  const initial = readCanvasSize(canvas);

  // view 传 HTMLCanvasElement，并按舞台尺寸给出 width/height → 固定尺寸画布铺满舞台。
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
    // zoom 段记录缩放范围；leafer.zoom() 会按它钳制。
    zoom: { min: SCALE_MIN, max: SCALE_MAX },
  });

  // —— 内容层 ——
  leafer.add(
    new Path({
      x: PAD_X,
      y: PAD_Y,
      path: gridPath(WORLD_W, WORLD_H),
      stroke: '#eef2f8',
      strokeWidth: 1,
    }),
  );

  // 内容原点标记：强调「视图在动，原点跟着内容一起动」。
  leafer.add([
    new Line({
      points: [PAD_X, PAD_Y, PAD_X + 30, PAD_Y],
      stroke: '#94a3b8',
      strokeWidth: 1.5,
    }),
    new Line({
      points: [PAD_X, PAD_Y, PAD_X, PAD_Y + 30],
      stroke: '#94a3b8',
      strokeWidth: 1.5,
    }),
    new Text({
      text: '内容原点',
      x: PAD_X + 10,
      y: PAD_Y + 4,
      fontSize: 12,
      fill: '#94a3b8',
    }),
  ]);

  leafer.add([
    new Rect({
      x: PAD_X + 90,
      y: PAD_Y + 90,
      width: 200,
      height: 120,
      fill: 'rgba(79, 124, 255, 0.18)',
      stroke: '#4f7cff',
      strokeWidth: 2,
      cornerRadius: 10,
    }),
    new Rect({
      x: PAD_X + 340,
      y: PAD_Y + 170,
      width: 120,
      height: 120,
      fill: 'rgba(50, 205, 121, 0.20)',
      stroke: '#32cd79',
      strokeWidth: 2,
      cornerRadius: 12,
    }),
    new Ellipse({
      x: PAD_X + 560,
      y: PAD_Y + 100,
      width: 120,
      height: 90,
      fill: 'rgba(245, 158, 11, 0.22)',
      stroke: '#f59e0b',
      strokeWidth: 2,
    }),
    new Text({
      text: '按住拖动平移 · 滚轮缩放',
      x: PAD_X + 90,
      y: PAD_Y + 230,
      fontSize: 16,
      fill: '#475569',
    }),
    new Text({
      text: '所有平移 / 缩放都作用在 zoomLayer 上',
      x: PAD_X + 90,
      y: PAD_Y + 256,
      fontSize: 13,
      fill: '#94a3b8',
    }),
  ]);

  // —— 状态与读数 ——
  let current: ViewControlOptions = {
    scale: 1,
    pan: true,
    wheelZoom: true,
    action: 'none',
  };

  const readScale = () => round2(leafer.zoomLayer.scaleX ?? 1);

  function syncReadout() {
    // 设值后世界矩阵不会立即重算，updateLayout() 触发同步布局，保证读到最新变换。
    leafer.updateLayout();
    const z = leafer.zoomLayer;
    emit({
      scale: round2(z.scaleX ?? 1),
      offsetX: Math.round(z.x ?? 0),
      offsetY: Math.round(z.y ?? 0),
      pan: current.pan,
      wheelZoom: current.wheelZoom,
    });
  }

  // —— 视图交互：拖拽平移 + 滚轮缩放，全部落在 zoomLayer 上 ——
  // 用 leafer.config.move / wheel 作为「是否启用」的开关，handler 读它决定要不要响应，
  // 这样「拖拽平移」「滚轮缩放」两个 Controls 开关就能直接改变画布行为。
  function ensureMoveConfig() {
    if (!leafer.config.move) leafer.config.move = {};
    return leafer.config.move;
  }
  function ensureWheelConfig() {
    if (!leafer.config.wheel) leafer.config.wheel = { zoomSpeed: 0.5 };
    return leafer.config.wheel;
  }
  ensureMoveConfig();
  ensureWheelConfig().zoomMode = true;

  // 拖拽平移：按住后把指针位移累加到 zoomLayer.x/y。
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const onPointerDown = (e: PointerEvent) => {
    if (!current.pan) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const z = leafer.zoomLayer;
    z.x = (z.x ?? 0) + (e.clientX - lastX);
    z.y = (z.y ?? 0) + (e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    syncReadout();
  };
  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
    syncReadout();
  };

  // 滚轮缩放：以光标为中心改 zoomLayer.scaleX/Y，并同步移动 x/y 让光标下的内容点不动。
  const onWheel = (e: WheelEvent) => {
    if (!current.wheelZoom) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const z = leafer.zoomLayer;
    const curScale = z.scaleX ?? 1;
    const factor = e.deltaY < 0 ? 1 + WHEEL_FACTOR : 1 / (1 + WHEEL_FACTOR);
    const newScale = clamp(curScale * factor, SCALE_MIN, SCALE_MAX);
    // 光标下的内容世界坐标：缩放前后保持该点钉在光标处。
    const wx = (cx - (z.x ?? 0)) / curScale;
    const wy = (cy - (z.y ?? 0)) / curScale;
    z.scaleX = newScale;
    z.scaleY = newScale;
    z.x = cx - wx * newScale;
    z.y = cy - wy * newScale;
    current.scale = round2(newScale);
    syncReadout();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // 首屏读数：等首轮渲染、世界矩阵就绪后派发。
  leafer.nextRender(syncReadout);

  // 舞台尺寸变化（如 Storybook 面板开合）时同步画布尺寸并刷新读数。
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    syncReadout();
  });

  return {
    update(options) {
      const prev = current;
      current = options;

      // 开关：handler 直接读 current.pan / current.wheelZoom，立即生效。
      // 同时写回 config，保证 leafer.config.move / wheel 反映当前状态（便于外部读取）。
      ensureMoveConfig().drag = options.pan ? true : false;
      ensureWheelConfig().zoomMode = options.wheelZoom;

      // 连续缩放：scale 变化时设为该绝对值。先于一次性动作执行，让 fit/reset 能覆盖它。
      if (options.scale !== prev.scale) {
        leafer.zoom(options.scale);
      }

      // 一次性动作：仅在 action 真正切换时触发，避免每次 update 重复执行；执行后覆盖上面的 scale。
      if (options.action !== 'none' && options.action !== prev.action) {
        if (options.action === 'fit') {
          // fit：自动把所有内容居中适配到画布（默认留 30px 内边距）。
          leafer.zoom('fit');
          current.scale = readScale();
        } else if (options.action === 'reset') {
          // 还原：把视图重置为 1× 且偏移归零。
          // leafer.zoom(1) 只把缩放设为 1、不清偏移，所以直接写 zoomLayer 才能彻底回到初始视图。
          const z = leafer.zoomLayer;
          z.scaleX = 1;
          z.scaleY = 1;
          z.x = 0;
          z.y = 0;
          current.scale = 1;
        }
      }

      syncReadout();
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
