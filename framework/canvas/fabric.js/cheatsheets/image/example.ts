/**
 * 范例介绍：用 3 个独立画布核对 FabricImage 的核心机制——
 * 1. 加载闭环：fromURL 的 Promise 管线（占位 → 兑现）、元素同步构造、setSrc 异步换源后宽高重置；
 * 2. 宽高与缩放：width/height 恒为源上的裁剪窗口（不随缩放变化），显示尺寸 = 窗口 × scaleX，
 *    scaleToWidth 按目标显示宽反推倍率，imageSmoothing 只影响绘制质量；
 * 3. 裁剪：cropX/cropY + width/height 四个数决定窗口，越界部分被渲染钳制，hasCrop() 反映窗口状态。
 * 输入：每个范例各自由 Controls 提供（加载方式、缩放入口与数值、平滑开关、裁剪窗口四数）。
 * 前置状态：图片源全部由本地离屏 canvas / dataURL 生成，不依赖外网（Storybook 内嵌可稳定复现）。
 * 预期结果：画面变化与 readout 读数（加载状态、窗口/显示尺寸、hasCrop）逐项对应。
 * 阅读主线：3 个 create* 函数各对应正文一个小节，update() 展示对应公开 API 的最小用法。
 */
import { Canvas, FabricImage, FabricText, Rect } from 'fabric';
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

/** 左上角的说明小标签：不参与交互 */
function createCaption(text: string, left: number, top: number) {
  return new FabricText(text, {
    left,
    top,
    originX: 'left',
    originY: 'top',
    fontSize: 13,
    fill: '#64748b',
    selectable: false,
    evented: false,
  });
}

/** 把尺寸读数统一为定宽文本，便于 readout 对齐 */
function joinSize(size: { width: number; height: number }) {
  return `${Math.round(size.width)}×${Math.round(size.height)}`;
}

/** 保留 2 位小数：缩放倍率不是整数 */
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * 生成本地图片源：象限底色 + 网格 + 中心十字，保证裁剪窗口的位置和大小一眼可辨。
 * 离屏 canvas 本身就是合法的 FabricImage 源（ImageSource 的一种），
 * 也可以 toDataURL() 后交给 fromURL，走与网络 URL 完全相同的 loadImage 管线。
 */
function createSourceElement(width: number, height: number, grid: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const quadrants: Array<[string, number, number]> = [
    ['#dbeafe', 0, 0],
    ['#dcfce7', width / 2, 0],
    ['#fef3c7', 0, height / 2],
    ['#fee2e2', width / 2, height / 2],
  ];
  quadrants.forEach(([color, x, y]) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width / 2, height / 2);
  });
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  for (let x = grid; x < width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = grid; y < height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  return el;
}

// ---------------------------------------------------------------------------
// 范例 1：加载闭环——fromURL（Promise 管线）/ 元素同步构造 / setSrc 换源
// ---------------------------------------------------------------------------

export type LoadMode = 'fromURL' | 'constructor' | 'setSrc';

const LOAD_LABELS: Record<LoadMode, string> = {
  fromURL: 'FabricImage.fromURL(dataURL)：与网络 URL 同一条 Promise 加载管线',
  constructor: 'new FabricImage(canvas 元素)：同步构造，宽高立即可读',
  setSrc: '先同步构造 80×60 小图，再 setSrc(dataURL) 异步换源',
};

export interface LoadingPathsOptions {
  loadMode: LoadMode;
}

export interface LoadingPathsSnapshot {
  status: string;
  elapsed: string;
  originalSize: string;
  size: string;
}

export interface LoadingPathsInstance {
  update(options: LoadingPathsOptions): void;
  dispose(): void;
}

export function createLoadingPaths(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: LoadingPathsSnapshot) => void,
): LoadingPathsInstance {
  let stageSize = { ...INITIAL_SIZE };
  let disposed = false;

  const stage = setupStage(canvasEl, (width, height) => {
    stageSize = { width, height };
    stage.fabricCanvas.setDimensions({ width, height });
    rerender();
  });

  const source = createSourceElement(320, 240, 40);
  // dataURL 加载走真实 loadImage：创建 HTMLImageElement、异步 onload，与网络 URL 仅差取数来源
  const dataUrl = source.toDataURL('image/png');

  const label = createCaption(LOAD_LABELS.fromURL, 16, 12);

  // fromURL 未兑现期间的占位：证明异步管线存在“图还没好”的间隙
  const placeholder = new Rect({
    width: 320,
    height: 240,
    originX: 'center',
    originY: 'center',
    fill: 'rgba(148,163,184,0.08)',
    stroke: '#94a3b8',
    strokeWidth: 1,
    strokeDashArray: [6, 6],
    visible: false,
    selectable: false,
    evented: false,
  });
  const placeholderLabel = new FabricText('Promise 进行中…', {
    fontSize: 16,
    fill: '#64748b',
    originX: 'center',
    originY: 'center',
    visible: false,
    selectable: false,
    evented: false,
  });
  stage.fabricCanvas.add(label, placeholder, placeholderLabel);

  let ctorImg: FabricImage | null = null;
  let fromUrlImg: FabricImage | null = null;
  let fromUrlState: 'idle' | 'pending' | 'done' = 'idle';
  let fromUrlElapsed = '';
  let setSrcImg: FabricImage | null = null;
  let setSrcState: 'idle' | 'pending' | 'done' = 'idle';
  let mode: LoadMode = 'fromURL';

  function center() {
    return { x: stageSize.width / 2, y: stageSize.height * 0.45 };
  }

  function startFromUrl() {
    if (fromUrlState !== 'idle') {
      return;
    }
    fromUrlState = 'pending';
    const startedAt = performance.now();
    // fromURL(url, 加载选项, 对象选项)：dataURL 也走 createElement('img') + onload
    FabricImage.fromURL(dataUrl).then((img) => {
      if (disposed) {
        return;
      }
      fromUrlElapsed = `${(performance.now() - startedAt).toFixed(1)} ms`;
      fromUrlImg = img;
      fromUrlState = 'done';
      const { x, y } = center();
      img.set({ left: x, top: y, originX: 'center', originY: 'center' });
      stage.fabricCanvas.add(img);
      rerender();
    });
  }

  function ensureSetSrcImage() {
    if (!setSrcImg) {
      // 初始小图：80×60 纯色离屏 canvas，换源前后的尺寸差异可见
      const small = document.createElement('canvas');
      small.width = 80;
      small.height = 60;
      const ctx = small.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(0, 0, 80, 60);
      }
      setSrcImg = new FabricImage(small, {
        left: center().x,
        top: center().y,
        originX: 'center',
        originY: 'center',
      });
      stage.fabricCanvas.add(setSrcImg);
    }
    if (setSrcState === 'idle') {
      setSrcState = 'pending';
      // setSrc 返回 Promise<void>：完成后 setElement 用新元素尺寸重置 width/height，且不触发重绘
      setSrcImg.setSrc(dataUrl).then(() => {
        if (disposed || !setSrcImg) {
          return;
        }
        setSrcState = 'done';
        setSrcImg.setCoords();
        rerender();
      });
    }
  }

  function rerender() {
    if (disposed) {
      return;
    }
    const { x, y } = center();
    const active =
      mode === 'constructor'
        ? ctorImg
        : mode === 'fromURL'
          ? fromUrlImg
          : setSrcImg;
    [ctorImg, fromUrlImg, setSrcImg].forEach((img) => {
      // 三张图共用一个位置：只显示当前加载方式的产物
      img?.set({ left: x, top: y, visible: img === active });
    });
    const showPlaceholder = mode === 'fromURL' && fromUrlState === 'pending';
    placeholder.set({ left: x, top: y, visible: showPlaceholder });
    placeholderLabel.set({ left: x, top: y, visible: showPlaceholder });
    label.set({ text: LOAD_LABELS[mode] });
    stage.fabricCanvas.requestRenderAll();

    let status: string;
    if (mode === 'constructor') {
      status = '同步构造：实例与宽高立即可用';
    } else if (mode === 'fromURL') {
      status =
        fromUrlState === 'pending'
          ? 'Promise 进行中（占位显示）'
          : fromUrlState === 'done'
            ? 'Promise 已兑现'
            : '未发起';
    } else {
      status =
        setSrcState === 'idle'
          ? '初始小图（80×60）'
          : setSrcState === 'pending'
            ? 'setSrc Promise 进行中'
            : '已完成：宽高重置为 320×240';
    }
    emit({
      status,
      elapsed: mode === 'fromURL' && fromUrlElapsed ? fromUrlElapsed : '—',
      originalSize: active ? joinSize(active.getOriginalSize()) : '—',
      size: active ? joinSize(active) : '—（Promise 进行中）',
    });
  }

  return {
    update(options: LoadingPathsOptions) {
      mode = options.loadMode;
      if (mode === 'constructor' && !ctorImg) {
        // 元素直接进构造函数：同步完成，width/height 立即可读
        ctorImg = new FabricImage(source, {
          left: center().x,
          top: center().y,
          originX: 'center',
          originY: 'center',
        });
        stage.fabricCanvas.add(ctorImg);
      }
      if (mode === 'fromURL') {
        startFromUrl();
      }
      if (mode === 'setSrc') {
        ensureSetSrcImage();
      }
      rerender();
    },
    dispose() {
      disposed = true;
      stage.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 范例 2：宽高与缩放——width/height 恒为源窗口，显示尺寸 = 窗口 × scaleX
// ---------------------------------------------------------------------------

export type ScaleMode = 'scale' | 'fitWidth';

const SCALE_SOURCE_SIZE = { width: 96, height: 72 };

export interface ScalingSizeOptions {
  scaleMode: ScaleMode;
  scaleFactor: number;
  targetWidth: number;
  smoothing: boolean;
}

export interface ScalingSizeSnapshot {
  windowSize: string;
  displaySize: string;
  scale: string;
  smoothing: string;
}

export interface ScalingSizeInstance {
  update(options: ScalingSizeOptions): void;
  dispose(): void;
}

export function createScalingSize(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ScalingSizeSnapshot) => void,
): ScalingSizeInstance {
  let stageSize = { ...INITIAL_SIZE };

  const stage = setupStage(canvasEl, (width, height) => {
    stageSize = { width, height };
    stage.fabricCanvas.setDimensions({ width, height });
    image.set({ left: width / 2, top: height * 0.45 });
    stage.fabricCanvas.requestRenderAll();
  });

  const caption = createCaption(
    `源窗口恒为 ${SCALE_SOURCE_SIZE.width}×${SCALE_SOURCE_SIZE.height}：缩放只改 scaleX/scaleY`,
    16,
    12,
  );
  // 96×72 的小源图：放大后 imageSmoothing 的开/关差异肉眼可辨
  const image = new FabricImage(
    createSourceElement(
      SCALE_SOURCE_SIZE.width,
      SCALE_SOURCE_SIZE.height,
      24,
    ),
    {
      left: stageSize.width / 2,
      top: stageSize.height * 0.45,
      originX: 'center',
      originY: 'center',
    },
  );
  stage.fabricCanvas.add(caption, image);

  return {
    update(options: ScalingSizeOptions) {
      if (options.scaleMode === 'scale') {
        // 直接设倍率：窗口尺寸不变，显示尺寸 = 窗口 × scaleX
        image.set({ scaleX: options.scaleFactor, scaleY: options.scaleFactor });
      } else {
        // 按目标显示宽反推倍率：scaleToWidth 改的仍是 scaleX（含 scaleY 等比）
        image.scaleToWidth(options.targetWidth);
      }
      // imageSmoothing 默认 true：只影响绘制质量，不改变任何尺寸读数
      image.set('imageSmoothing', options.smoothing);
      stage.fabricCanvas.requestRenderAll();
      emit({
        windowSize: joinSize(image),
        displaySize: `${Math.round(image.getScaledWidth())}×${Math.round(
          image.getScaledHeight(),
        )}`,
        scale: `${round2(image.scaleX)} / ${round2(image.scaleY)}`,
        smoothing: String(image.imageSmoothing),
      });
    },
    dispose: stage.dispose,
  };
}

// ---------------------------------------------------------------------------
// 范例 3：裁剪窗口——cropX/cropY + width/height 四个数，越界被渲染钳制
// ---------------------------------------------------------------------------

const CROP_SOURCE_SIZE = { width: 320, height: 240 };
/** 两侧都按 0.6 显示：源图与裁剪结果同屏对照 */
const CROP_DISPLAY_SCALE = 0.6;
const CROP_GAP = 40;

export interface CropWindowOptions {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

export interface CropWindowSnapshot {
  setValues: string;
  visibleWindow: string;
  hasCrop: string;
  displaySize: string;
}

export interface CropWindowInstance {
  update(options: CropWindowOptions): void;
  dispose(): void;
}

/**
 * 与渲染一致的有效窗口：偏移不取负，宽高不超出源边界。
 * 对应源码 _renderFill 的钳制：cropX = Math.max(cropX, 0)、
 * sW = Math.min(width, elementWidth − cropX)——窗口出界部分直接没有像素，不会回移窗口。
 */
function visibleWindow(
  cropX: number,
  cropY: number,
  width: number,
  height: number,
) {
  const x = Math.max(cropX, 0);
  const y = Math.max(cropY, 0);
  return {
    x,
    y,
    width: Math.min(width, CROP_SOURCE_SIZE.width - x),
    height: Math.min(height, CROP_SOURCE_SIZE.height - y),
  };
}

export function createCropWindow(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: CropWindowSnapshot) => void,
): CropWindowInstance {
  let stageSize = { ...INITIAL_SIZE };
  let current: CropWindowOptions = { cropX: 120, cropY: 80, cropW: 160, cropH: 120 };

  const stage = setupStage(canvasEl, (width, height) => {
    stageSize = { width, height };
    stage.fabricCanvas.setDimensions({ width, height });
    applyLayout();
    stage.fabricCanvas.requestRenderAll();
  });

  const source = createSourceElement(
    CROP_SOURCE_SIZE.width,
    CROP_SOURCE_SIZE.height,
    40,
  );

  // 左：完整源图（缩小显示）+ 虚线窗口框；右：同一元素按四数裁剪的结果
  const sourceView = new FabricImage(source, {
    originX: 'left',
    originY: 'top',
    scaleX: CROP_DISPLAY_SCALE,
    scaleY: CROP_DISPLAY_SCALE,
    selectable: false,
    evented: false,
  });
  const windowFrame = new Rect({
    originX: 'left',
    originY: 'top',
    fill: 'rgba(79,124,255,0.10)',
    stroke: '#4f7cff',
    strokeWidth: 1,
    strokeDashArray: [4, 3],
    selectable: false,
    evented: false,
  });
  const resultView = new FabricImage(source, {
    originX: 'left',
    originY: 'top',
    cropX: current.cropX,
    cropY: current.cropY,
    width: current.cropW,
    height: current.cropH,
    scaleX: CROP_DISPLAY_SCALE,
    scaleY: CROP_DISPLAY_SCALE,
  });
  const sourceCaption = createCaption('源图与裁剪窗口（虚线）', 24, 30);
  const resultCaption = createCaption(
    `裁剪结果（同一元素，显示 ×${CROP_DISPLAY_SCALE}）`,
    24,
    30,
  );
  stage.fabricCanvas.add(
    sourceCaption,
    resultCaption,
    sourceView,
    windowFrame,
    resultView,
  );

  function applyLayout() {
    const contentWidth =
      CROP_SOURCE_SIZE.width * CROP_DISPLAY_SCALE * 2 + CROP_GAP;
    const sourceLeft = Math.max(
      16,
      (stageSize.width - contentWidth) / 2,
    );
    const top = 64;
    const resultLeft =
      sourceLeft + CROP_SOURCE_SIZE.width * CROP_DISPLAY_SCALE + CROP_GAP;
    sourceView.set({ left: sourceLeft, top });
    sourceCaption.set({ left: sourceLeft });
    resultView.set({ left: resultLeft, top });
    resultCaption.set({ left: resultLeft });
    const visible = visibleWindow(
      current.cropX,
      current.cropY,
      current.cropW,
      current.cropH,
    );
    windowFrame.set({
      left: sourceLeft + visible.x * CROP_DISPLAY_SCALE,
      top: top + visible.y * CROP_DISPLAY_SCALE,
      width: visible.width * CROP_DISPLAY_SCALE,
      height: visible.height * CROP_DISPLAY_SCALE,
    });
  }

  applyLayout();

  return {
    update(options: CropWindowOptions) {
      current = options;
      // 四数一起 set：cropX/cropY 是窗口在源图上的偏移，width/height 是窗口大小
      resultView.set({
        cropX: options.cropX,
        cropY: options.cropY,
        width: options.cropW,
        height: options.cropH,
      });
      applyLayout();
      stage.fabricCanvas.requestRenderAll();
      const visible = visibleWindow(
        options.cropX,
        options.cropY,
        options.cropW,
        options.cropH,
      );
      emit({
        setValues: `${options.cropX}, ${options.cropY}, ${options.cropW}, ${options.cropH}`,
        visibleWindow: `${Math.round(visible.width)}×${Math.round(
          visible.height,
        )} @ (${visible.x}, ${visible.y})`,
        hasCrop: String(resultView.hasCrop()),
        displaySize: `${Math.round(resultView.getScaledWidth())}×${Math.round(
          resultView.getScaledHeight(),
        )}`,
      });
    },
    dispose: stage.dispose,
  };
}
