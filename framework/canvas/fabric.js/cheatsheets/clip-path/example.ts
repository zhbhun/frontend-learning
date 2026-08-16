/**
 * 范例介绍：两个"裁剪实验台"，核对 clipPath 的坐标系、合成方向与缓存机制——
 * 1. 遮罩实验台（对象级 host.clipPath）：斜条纹 Pattern 矩形作宿主（可点选、拖动、旋转），
 *    遮罩形状 circle / rect / triangle 可切换；「绝对定位」切 absolutePositioned（false =
 *    宿主局部坐标、贴花式跟随宿主；true = 画布场景坐标、固定窗口），「反转裁剪」切
 *    inverted（destination-in 裁内 / destination-out 裁外），拖动宿主即可核对两种坐标系差异；
 *    默认走"换新实例 set('clipPath')"路径（clipPath 在宿主 cacheProperties，自动置 dirty），
 *    开「就地修改」后原地改遮罩属性——宿主缓存不重画（读数「缓存位图重画」停住即为证据），
 *    再开「手动置 dirty」画面追上。
 * 2. 画布实验台（画布级 canvas.clipPath）：整块画布内容（背景色、三个对象、控件）被同一
 *    窗口限制，锚定画布左上角（场景坐标）、跟随「视口缩放」；「反转裁剪」在画布级无效果
 *    （源码 drawClipPathOnCanvas 恒 destination-in），开关切换画面不变即是证据。
 * 输入：Controls 面板控件（对应本课公开 API：clipPath / absolutePositioned / inverted）；
 *    画布上可直接点选、拖动、旋转对象。
 * 预期结果：两块画布的可见区域联动变化，读数（遮罩类型、坐标系、合成方向、遮罩中心、
 *    更新方式、缓存位图重画次数、toObject 摘要）可逐项核对。
 * 阅读主线：newMask() / applyMaskInPlace() 把控件映射成遮罩实例；update() 演示
 * "换新实例赋值"与"就地修改"两条路径的差别；syncSize() 跟随舞台尺寸。
 */
import { Canvas, Circle, FabricText, Pattern, Rect, Triangle } from 'fabric';
import type { DrawContext } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 遮罩实验台的宿主矩形：斜条纹让"内容在固定窗口下滑动"可观察 */
const HOST_RECT = { width: 300, height: 210 };
/** 斜条纹 tile 的边长（Pattern 机制见「渐变与图案」课） */
const STRIPE_TILE = 24;

/* -------------------------------------------------- 遮罩实验台（对象级） -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（对象级部分） */
export interface ClipShapeLabOptions {
  /** 遮罩形状：clipPath 可以是任意 FabricObject，这里用三种基础图形对照可见区域轮廓 */
  clipShape: 'circle' | 'rect' | 'triangle';
  /** absolutePositioned：false 宿主局部坐标（原点为宿主几何中心）；true 画布场景坐标（固定窗口） */
  absolutePositioned: boolean;
  /** inverted：false 裁内（destination-in）；true 裁外（destination-out） */
  inverted: boolean;
  /** 遮罩尺寸（px）：circle 的半径 / rect 与 triangle 的基准边长 */
  clipSize: number;
  /** 遮罩角度（度）：绕遮罩自身中心旋转（rect / triangle 上效果最明显） */
  clipAngle: number;
  /** 遮罩横向偏移（px）：同一数值在两种定位模式下落在不同坐标系 */
  clipOffsetX: number;
  /** 就地修改：不换实例、直接改遮罩属性（宿主的 set 缺席，缓存位图不重画） */
  mutateInPlace: boolean;
  /** 手动置 dirty：host.set('dirty', true) 强制重画宿主缓存位图 */
  markDirty: boolean;
}

/** 派生读数：由 readout 显示 */
export interface ClipShapeLabSnapshot {
  maskLabel: string;
  positionModeLabel: string;
  invertLabel: string;
  maskCenterLabel: string;
  updateModeLabel: string;
  cacheRepaints: number;
  serializedLabel: string;
}

export interface ClipShapeLabInstance {
  update(options: ClipShapeLabOptions): void;
  dispose(): void;
}

type MaskShape = ClipShapeLabOptions['clipShape'];
type MaskInstance = Circle | Rect | Triangle;

function maskDimensions(shape: MaskShape, size: number) {
  if (shape === 'rect') return { width: size * 2, height: size * 1.5 };
  if (shape === 'triangle') return { width: size * 2, height: size * 1.75 };
  return { width: size * 2, height: size * 2 };
}

/** 换新实例：宿主 set('clipPath', ...) 时引用变化 → 自动置 dirty，重画缓存位图 */
function newMask(
  shape: MaskShape,
  size: number,
  left: number,
  top: number,
  angle: number,
  absolutePositioned: boolean,
  inverted: boolean,
): MaskInstance {
  const base = { left, top, angle, absolutePositioned, inverted };
  if (shape === 'circle') {
    return new Circle({ ...base, radius: size });
  }
  const { width, height } = maskDimensions(shape, size);
  return shape === 'rect'
    ? new Rect({ ...base, width, height })
    : new Triangle({ ...base, width, height });
}

/** 就地修改：遮罩字段原地改、实例引用不变 → 宿主的 set 缺席、不置 dirty */
function applyMaskInPlace(
  mask: MaskInstance,
  shape: MaskShape,
  size: number,
  left: number,
  top: number,
  angle: number,
  absolutePositioned: boolean,
  inverted: boolean,
): void {
  mask.set({ left, top, angle, absolutePositioned, inverted });
  if (mask instanceof Circle) {
    mask.set('radius', size);
  } else {
    const { width, height } = maskDimensions(shape, size);
    mask.set({ width, height });
  }
}

/** 斜条纹 tile：无缝 45° 条纹让宿主内容在窗口下的移动方向可观察 */
function buildStripesPattern(): Pattern {
  const tile = document.createElement('canvas');
  tile.width = STRIPE_TILE;
  tile.height = STRIPE_TILE;
  const ctx = tile.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const s = STRIPE_TILE;
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 7;
  ctx.beginPath();
  // 三段 45° 线（主对角线 + 两个角补线）拼出首尾相接的斜条纹
  ctx.moveTo(-s / 2, s / 2);
  ctx.lineTo(s / 2, -s / 2);
  ctx.moveTo(0, s);
  ctx.lineTo(s, 0);
  ctx.moveTo(s / 2, s * 1.5);
  ctx.lineTo(s * 1.5, s / 2);
  ctx.stroke();
  return new Pattern({ source: tile });
}

export function createClipShapeLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ClipShapeLabSnapshot) => void,
): ClipShapeLabInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  const initial: ClipShapeLabOptions = {
    clipShape: 'circle',
    absolutePositioned: false,
    inverted: false,
    clipSize: 64,
    clipAngle: 0,
    clipOffsetX: 0,
    mutateInPlace: false,
    markDirty: false,
  };

  // 宿主：默认可点选、拖动、旋转；originX/originY 默认 center，left/top 即中心点
  const host = new Rect({
    left: INITIAL_SIZE.width * 0.38,
    top: INITIAL_SIZE.height * 0.5,
    width: HOST_RECT.width,
    height: HOST_RECT.height,
    fill: buildStripesPattern(),
    stroke: '#0f172a',
    strokeWidth: 2,
  });
  fabricCanvas.add(host);

  // 统计宿主的缓存位图重画：只有画进它自己的 _cacheContext 才算一次
  let cacheRepaints = 0;
  const originalDrawObject = host.drawObject.bind(host);
  host.drawObject = (
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: DrawContext,
  ) => {
    if (ctx === host._cacheContext) {
      cacheRepaints += 1;
    }
    originalDrawObject(ctx, forClipping, context);
  };

  let current: ClipShapeLabOptions = initial;
  let mask: MaskInstance = newMask(
    initial.clipShape,
    initial.clipSize,
    0,
    0,
    0,
    false,
    false,
  );
  let maskShape: MaskShape = initial.clipShape;
  let updateModeLabel = "换新实例 set('clipPath')";

  /**
   * 遮罩 left/top 的两种解释：
   * 非绝对定位 = 宿主局部坐标，(0, 0) 即宿主几何中心；
   * 绝对定位 = 画布场景坐标，锚点固定在画布布局上（不随宿主拖动）。
   */
  function maskPosition(options: ClipShapeLabOptions) {
    if (options.absolutePositioned) {
      return {
        left: fabricCanvas.getWidth() * 0.38 + options.clipOffsetX,
        top: fabricCanvas.getHeight() * 0.5,
      };
    }
    return { left: options.clipOffsetX, top: 0 };
  }

  function emitSnapshot() {
    const { left, top } = maskPosition(current);
    const dims = maskDimensions(current.clipShape, current.clipSize);
    const clipData = host.toObject().clipPath;
    emit({
      maskLabel:
        current.clipShape === 'circle'
          ? `circle（r=${current.clipSize}）`
          : `${current.clipShape}（${Math.round(dims.width)}×${Math.round(dims.height)}）`,
      positionModeLabel: current.absolutePositioned
        ? 'true · 画布场景坐标'
        : 'false · 宿主局部（几何中心为原点）',
      invertLabel: current.inverted
        ? 'true · 裁外（destination-out）'
        : 'false · 裁内（destination-in）',
      maskCenterLabel: current.absolutePositioned
        ? `(${Math.round(left)}, ${Math.round(top)}) 画布场景`
        : `(${Math.round(left)}, ${Math.round(top)}) 宿主局部`,
      updateModeLabel,
      cacheRepaints,
      // 序列化证据：toObject 自动附上 inverted 与 absolutePositioned
      serializedLabel: clipData
        ? `${clipData.type} · inverted: ${String(clipData.inverted)} · absolutePositioned: ${String(clipData.absolutePositioned)}`
        : '未序列化',
    });
  }

  function update(options: ClipShapeLabOptions) {
    current = options;
    const { left, top } = maskPosition(options);
    if (options.mutateInPlace && options.clipShape === maskShape) {
      // 引用不变：宿主的 set 缺席，缓存位图保持旧画面
      applyMaskInPlace(
        mask,
        options.clipShape,
        options.clipSize,
        left,
        top,
        options.clipAngle,
        options.absolutePositioned,
        options.inverted,
      );
      updateModeLabel = options.markDirty
        ? '就地修改 + 手动置 dirty'
        : '就地修改（未失效缓存）';
      if (options.markDirty) {
        host.set('dirty', true);
      }
    } else {
      // 默认路径：换新实例赋值；形状是另一个类时也只能换新实例
      updateModeLabel =
        options.clipShape === maskShape
          ? "换新实例 set('clipPath')"
          : '形状切换，换新实例';
      mask = newMask(
        options.clipShape,
        options.clipSize,
        left,
        top,
        options.clipAngle,
        options.absolutePositioned,
        options.inverted,
      );
      maskShape = options.clipShape;
      host.set('clipPath', mask);
    }
    fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    host.set({ left: width * 0.38, top: height * 0.5 });
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  update(initial);

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}

/* -------------------------------------------------- 画布实验台（画布级） -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（画布级部分） */
export interface CanvasClipLabOptions {
  /** 遮罩形状：canvas.clipPath 同样只取几何 */
  canvasClipShape: 'circle' | 'rect';
  /** 遮罩尺寸（px）：circle 的半径 / rect 的基准边长 */
  canvasClipSize: number;
  /** 遮罩横向偏移（px）：场景坐标，原点固定在画布左上角 */
  canvasClipOffsetX: number;
  /** 遮罩纵向偏移（px） */
  canvasClipOffsetY: number;
  /** inverted：画布级渲染忽略该属性（恒 destination-in），开关无效果即是证据 */
  canvasInverted: boolean;
  /** 视口缩放：canvas.setZoom——画布级遮罩跟随 viewportTransform */
  viewportZoom: number;
}

/** 派生读数：由 readout 显示 */
export interface CanvasClipLabSnapshot {
  clipLabel: string;
  clipCenterLabel: string;
  invertedLabel: string;
  zoomLabel: string;
  serializedLabel: string;
}

export interface CanvasClipLabInstance {
  update(options: CanvasClipLabOptions): void;
  dispose(): void;
}

export function createCanvasClipLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CanvasClipLabSnapshot) => void,
): CanvasClipLabInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#dbeafe',
  });

  const initial: CanvasClipLabOptions = {
    canvasClipShape: 'circle',
    canvasClipSize: 104,
    canvasClipOffsetX: 0,
    canvasClipOffsetY: 0,
    canvasInverted: false,
    viewportZoom: 1,
  };

  // 场景内容：背景色 + 矩形 + 圆 + 文字，全部被画布级窗口限制
  const rect = new Rect({
    left: INITIAL_SIZE.width * 0.3,
    top: INITIAL_SIZE.height * 0.42,
    width: 170,
    height: 130,
    fill: '#38bdf8',
    stroke: '#0f172a',
    strokeWidth: 2,
  });
  const circle = new Circle({
    left: INITIAL_SIZE.width * 0.62,
    top: INITIAL_SIZE.height * 0.42,
    radius: 58,
    fill: '#f43f5e',
    stroke: '#0f172a',
    strokeWidth: 2,
  });
  const label = new FabricText('canvas.clipPath', {
    left: INITIAL_SIZE.width * 0.46,
    top: INITIAL_SIZE.height * 0.72,
    fontSize: 26,
    fill: '#0f172a',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  });
  fabricCanvas.add(rect, circle, label);

  let current: CanvasClipLabOptions = initial;

  function emitSnapshot() {
    const data = fabricCanvas.toObject() as { clipPath?: { type?: string } };
    const left = Math.round(
      fabricCanvas.getWidth() * 0.46 + current.canvasClipOffsetX,
    );
    const top = Math.round(
      fabricCanvas.getHeight() * 0.48 + current.canvasClipOffsetY,
    );
    emit({
      clipLabel: `canvas.clipPath: ${
        current.canvasClipShape === 'circle'
          ? `circle（r=${current.canvasClipSize}）`
          : `rect（${Math.round(current.canvasClipSize * 1.6)}×${Math.round(current.canvasClipSize * 1.2)}）`
      }`,
      clipCenterLabel: `(${left}, ${top}) 场景坐标`,
      invertedLabel: current.canvasInverted
        ? 'true（画布级忽略：恒 destination-in）'
        : 'false · 裁内（destination-in）',
      zoomLabel: String(fabricCanvas.viewportTransform[0]),
      serializedLabel: data.clipPath ? String(data.clipPath.type) : '未序列化',
    });
  }

  function update(options: CanvasClipLabOptions) {
    current = options;
    const left =
      fabricCanvas.getWidth() * 0.46 + options.canvasClipOffsetX;
    const top =
      fabricCanvas.getHeight() * 0.48 + options.canvasClipOffsetY;
    // 画布级没有宿主缓存路径：每次换新遮罩实例，位置在合成期生效、轮廓走遮罩自身缓存
    fabricCanvas.clipPath =
      options.canvasClipShape === 'circle'
        ? new Circle({
            left,
            top,
            radius: options.canvasClipSize,
            inverted: options.canvasInverted,
          })
        : new Rect({
            left,
            top,
            width: options.canvasClipSize * 1.6,
            height: options.canvasClipSize * 1.2,
            inverted: options.canvasInverted,
          });
    fabricCanvas.setZoom(options.viewportZoom);
    fabricCanvas.requestRenderAll();
    emitSnapshot();
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    rect.set({ left: width * 0.3, top: height * 0.42 });
    circle.set({ left: width * 0.62, top: height * 0.42 });
    label.set({ left: width * 0.46, top: height * 0.72 });
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  update(initial);

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
