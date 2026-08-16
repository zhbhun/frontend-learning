/**
 * 范例介绍：一个样式实验台，核对对象的四个样式轴如何叠加在同一对象上——
 * 1. fill / stroke 是画进对象缓存位图的两遍绘制：填充形态（颜色 / 'transparent' / null）、
 *    描边宽度、虚线、端点、拐角、paintFirst、strokeUniform 改的都是"画什么"；
 * 2. shadow、opacity、globalCompositeOperation 不进位图，在合成到画布时实时应用：
 *    只改这些参数时「缓存位图重画」读数不动；
 * 3. 底部三色条纹是混合模式的"已有内容"；右下折线专门观察 strokeLineCap / strokeLineJoin。
 * 输入：Controls 面板的样式控件（对应本课公开属性），画布上可直接点选、拖动对象。
 * 预期结果：主矩形与折线的外观联动变化，读数（fill 实际值 / hasFill() / 外接框宽 /
 *    整帧渲染次数 / 缓存位图重画 / 阴影有效偏移 X / opacity / 混合模式）可逐项核对。
 * 阅读主线：update() 把控件映射到对象属性；after:render 与 drawObject 包装负责读数。
 */
import { Canvas, Polyline, Rect, Shadow } from 'fabric';
import type { DrawContext, XY } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface FillStrokeShadowOptions {
  /** 填充形态：颜色 / 'transparent' / 无（null） */
  fillMode: 'color' | 'transparent' | 'none';
  /** 填充颜色（#rrggbb），仅「颜色」形态生效 */
  fillColor: string;
  /** 填充透明度：Fabric 没有 fillOpacity，与颜色合成 rgba 实现"只淡填充" */
  fillAlpha: number;
  /** 绘制顺序 paintFirst：fill 先画（描边被盖一半）或 stroke 先画（描边完整可见） */
  paintFirst: 'fill' | 'stroke';
  /** 描边宽度 strokeWidth，主矩形与折线共用 */
  strokeWidth: number;
  /** 虚线样式 strokeDashArray：实线 / 虚线 / 点线 */
  dashStyle: 'solid' | 'dash' | 'dot';
  /** 线端样式 strokeLineCap：作用于折线开放端点 */
  lineCap: 'butt' | 'round' | 'square';
  /** 拐角样式 strokeLineJoin：作用于折线拐角 */
  lineJoin: 'miter' | 'round' | 'bevel';
  /** 描边宽度锁定 strokeUniform：true 时缩放不拉伸描边 */
  strokeUniform: boolean;
  /** 对象缩放（scaleX = scaleY），观察描边与阴影是否跟随 */
  objectScale: number;
  /** 阴影颜色：带 alpha 的更柔和，不透明色投影生硬 */
  shadowColor: string;
  /** 阴影模糊 shadow.blur */
  shadowBlur: number;
  /** 阴影水平偏移 shadow.offsetX */
  shadowOffsetX: number;
  /** 阴影垂直偏移 shadow.offsetY */
  shadowOffsetY: number;
  /** 阴影不随缩放 shadow.nonScaling */
  shadowNonScaling: boolean;
  /** 整体透明度 opacity：作用于填充、描边与阴影整体 */
  opacity: number;
  /** 混合模式 globalCompositeOperation */
  composite: string;
}

/** 派生读数：由 readout 显示 */
export interface FillStrokeShadowSnapshot {
  fillValue: string;
  hasFillLabel: string;
  boundsWidth: string;
  renderCount: number;
  cacheRepaints: number;
  shadowOffsetXLabel: string;
  opacityLabel: string;
  composite: string;
}

export interface FillStrokeShadowInstance {
  update(options: FillStrokeShadowOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const RECT_SIZE = { width: 168, height: 112 };
/** M 形折线：两个尖角供 strokeLineJoin 观察，四个端点供 strokeLineCap 观察 */
const POLYLINE_POINTS: XY[] = [
  { x: 0, y: 48 },
  { x: 56, y: 0 },
  { x: 112, y: 48 },
  { x: 168, y: 0 },
  { x: 224, y: 48 },
];
const DASH_PATTERNS: Record<
  FillStrokeShadowOptions['dashStyle'],
  number[] | null
> = {
  solid: null,
  dash: [12, 8],
  dot: [1, 11],
};

/** Fabric 没有 fillOpacity：把 #rrggbb + alpha 合成 rgba 颜色字符串 */
function toRgbaColor(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function createFillStrokeShadow(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: FillStrokeShadowSnapshot) => void,
): FillStrokeShadowInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  // 三色条纹：混合模式与整体透明度作用的对象"底下的已有内容"
  const stripes = ['#ef4444', '#22c55e', '#3b82f6'].map(
    (fill) =>
      new Rect({
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        fill,
        selectable: false,
        evented: false,
      }),
  );

  // 主矩形：承载 fill / stroke / shadow / opacity / 混合模式全部维度
  const rect = new Rect({
    left: INITIAL_SIZE.width * 0.28,
    top: INITIAL_SIZE.height * 0.4,
    width: RECT_SIZE.width,
    height: RECT_SIZE.height,
    fill: '#f59e0b',
    stroke: '#0f172a',
  });

  // 折线：fill 显式 null（家族默认黑填充），靠 stroke 成形
  const polyline = new Polyline(POLYLINE_POINTS, {
    left: INITIAL_SIZE.width * 0.66,
    top: INITIAL_SIZE.height * 0.74,
    fill: null,
    stroke: '#0f172a',
  });

  fabricCanvas.add(...stripes, rect, polyline);

  let renderCount = 0;
  fabricCanvas.on('after:render', (event) => {
    // renderTop()（只刷上层）也派发 after:render，这里只统计下层整帧重绘
    if (event.ctx === fabricCanvas.contextContainer) {
      renderCount += 1;
    }
    emitSnapshot();
  });

  // 统计主矩形的缓存位图重画：只有画进它自己的 _cacheContext 才算一次
  let cacheRepaints = 0;
  const originalDrawObject = rect.drawObject.bind(rect);
  rect.drawObject = (
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: DrawContext,
  ) => {
    if (ctx === rect._cacheContext) {
      cacheRepaints += 1;
    }
    originalDrawObject(ctx, forClipping, context);
  };

  function emitSnapshot() {
    const shadow =
      rect.shadow instanceof Shadow ? rect.shadow : null;
    const scalingX = shadow?.nonScaling ? 1 : Math.abs(rect.scaleX);
    emit({
      fillValue: String(rect.fill),
      hasFillLabel: rect.hasFill() ? '是' : '否',
      boundsWidth: rect.getBoundingRect().width.toFixed(1),
      renderCount,
      cacheRepaints,
      // 视口缩放为 1 时，ctx.shadowOffsetX = offsetX × 对象缩放（nonScaling 时不乘）
      shadowOffsetXLabel: shadow
        ? (shadow.offsetX * scalingX).toFixed(1)
        : '—',
      opacityLabel: rect.opacity.toFixed(2),
      composite: String(rect.globalCompositeOperation),
    });
  }

  function syncSize() {
    // wrapperEl 的父级就是共享舞台；createResizeObserver 观察的正是"传入元素的父级"
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    stripes.forEach((stripe, index) => {
      stripe.set({
        left: (index * width) / 3 + width / 6,
        top: height / 2,
        width: width / 3,
        height,
      });
    });
    // originX / originY 默认 center：left / top 即对象中心点，缩放不会移动中心
    rect.set({ left: width * 0.28, top: height * 0.4 });
    polyline.set({ left: width * 0.66, top: height * 0.74 });
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(options: FillStrokeShadowOptions) {
    const fill =
      options.fillMode === 'color'
        ? toRgbaColor(options.fillColor, options.fillAlpha)
        : options.fillMode === 'transparent'
          ? 'transparent'
          : null;
    const strokeDashArray = DASH_PATTERNS[options.dashStyle];

    // 这批属性都属于 cacheProperties：set() 改到值会自动置 dirty，下一帧重画位图
    rect.set({
      fill,
      paintFirst: options.paintFirst,
      strokeWidth: options.strokeWidth,
      strokeDashArray,
      strokeLineCap: options.lineCap,
      strokeLineJoin: options.lineJoin,
      strokeUniform: options.strokeUniform,
      scaleX: options.objectScale,
      scaleY: options.objectScale,
      opacity: options.opacity,
      globalCompositeOperation: options.composite as GlobalCompositeOperation,
    });
    polyline.set({
      strokeWidth: options.strokeWidth,
      strokeDashArray,
      strokeLineCap: options.lineCap,
      strokeLineJoin: options.lineJoin,
      strokeUniform: options.strokeUniform,
      scaleX: options.objectScale,
      scaleY: options.objectScale,
    });

    // set() 对 shadow 做特殊处理：普通对象会被包装成 Shadow（整体替换，字段缺省回默认值）
    rect.set('shadow', {
      color: options.shadowColor,
      blur: options.shadowBlur,
      offsetX: options.shadowOffsetX,
      offsetY: options.shadowOffsetY,
      nonScaling: options.shadowNonScaling,
    });

    emitSnapshot();
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
