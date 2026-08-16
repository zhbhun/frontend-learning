/**
 * 范例介绍：两个"填充颜料"实验台，核对 Gradient 与 Pattern 的参数、坐标锚定与更新机制——
 * 1. 渐变实验台：主矩形与右侧小圆共享同一个 Gradient 实例（读数"实例 id / 共享实例"可核对）；
 *    线性/径向切换、线性角度、中间色标 offset、径向内半径与焦点偏移默认走"换新实例 + set('fill')"路径，
 *    打开"就地修改"开关后改为原地改实例、不重新赋值——配合"手动置 dirty"开关演示：
 *    引用不变时 set 缺席、缓存位图不重画（读数"缓存位图重画"停住即为证据）；
 *    "对象旋转"证明渐变锚定在对象自身坐标系（贴花式随对象一起转）。
 * 2. 图案实验台：程序化 tile（离屏 canvas，同步可用）同时铺主矩形与小圆；
 *    repeat 四值、offsetX/offsetY、patternTransform 旋转与对象旋转联动；
 *    读数给出 source 形态与序列化结果（dataURL 前缀与长度）。
 * 输入：Controls 面板控件（对应本课公开 API：type/coords/colorStops、repeat/offsetX/offsetY/
 *    patternTransform）；画布上可直接点选、拖动对象。
 * 预期结果：两块画布的外观联动变化，读数（fill 类型、坐标摘要、色标 offset、更新方式、
 *    缓存位图重画次数、repeat、source 序列化等）可逐项核对。
 * 阅读主线：buildGradient()/buildPattern() 把控件映射成颜料实例；update() 演示
 * "换新实例赋值"与"就地修改"两条更新路径的差别；各实验台内的 syncSize() 跟随舞台尺寸。
 */
import { Canvas, Circle, Gradient, Pattern, Rect } from 'fabric';
import type { DrawContext, PatternRepeat, TFiller, TMat2D } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
/** 渐变实验台主矩形：px 单位的 coords 全部以它的局部坐标系解释 */
const MAIN_RECT = { width: 280, height: 160 };
/** 渐变色标的三种颜色：中间色标的 offset 由控件驱动 */
const STOP_COLORS = { start: '#0ea5e9', middle: '#f43f5e', end: '#fde047' } as const;

/* -------------------------------------------------- 渐变实验台 -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（渐变部分） */
export interface GradientLabOptions {
  /** 渐变类型 type：linear 线性 / radial 径向 */
  gradientType: 'linear' | 'radial';
  /** 线性轴角度（度）：端点取过对象中心、按该角度横贯对象的直径两端 */
  gradientAngle: number;
  /** 中间色标 offset：0..1，两端色标固定 0 与 1 */
  stopOffset: number;
  /** 径向内圆半径 r1：外圆 r2 固定 160（足够覆盖矩形对角） */
  radialR1: number;
  /** 径向焦点偏移：内圆圆心相对外圆圆心的水平偏移系数（-1..1 × 120px），形成"侧光" */
  focalShift: number;
  /** 对象旋转角（度）：证明渐变随对象一起转（贴花式锚定） */
  objectAngle: number;
  /** 就地修改：不换实例、直接改 type/coords/colorStops（fill 引用不变 → 不自动置 dirty） */
  mutateInPlace: boolean;
  /** 手动置 dirty：set('dirty', true) 强制缓存位图重画，配合"就地修改"演示缓存机制 */
  markDirty: boolean;
}

/** 派生读数：由 readout 显示 */
export interface GradientLabSnapshot {
  fillTypeLabel: string;
  gradientId: string;
  coordsLabel: string;
  stopsLabel: string;
  updateModeLabel: string;
  cacheRepaints: number;
  sharedLabel: string;
  serializedTypeLabel: string;
}

export interface GradientLabInstance {
  update(options: GradientLabOptions): void;
  dispose(): void;
}

/** 两个分支都以字面量 type 构造；返回合并实例类型，读取 coords 联合时用 'r1' in 收窄 */
function buildGradient(
  options: GradientLabOptions,
): Gradient<'linear' | 'radial'> {
  const colorStops = [
    { offset: 0, color: STOP_COLORS.start },
    { offset: options.stopOffset, color: STOP_COLORS.middle },
    { offset: 1, color: STOP_COLORS.end },
  ];
  const cx = MAIN_RECT.width / 2;
  const cy = MAIN_RECT.height / 2;
  if (options.gradientType === 'radial') {
    return new Gradient({
      type: 'radial' as const,
      // 内圆（offset 0）圆心可偏离外圆（offset 1），视觉上是偏心侧光
      coords: {
        x1: cx + options.focalShift * 120,
        y1: cy,
        r1: options.radialR1,
        x2: cx,
        y2: cy,
        r2: 160,
      },
      colorStops,
    });
  }
  // 端点取"过对象中心、按角度方向的整条直径"：任意角度都能横贯整个矩形
  const rad = (options.gradientAngle * Math.PI) / 180;
  const half = Math.hypot(MAIN_RECT.width, MAIN_RECT.height) / 2;
  return new Gradient({
    type: 'linear' as const,
    coords: {
      x1: cx - Math.cos(rad) * half,
      y1: cy - Math.sin(rad) * half,
      x2: cx + Math.cos(rad) * half,
      y2: cy + Math.sin(rad) * half,
    },
    colorStops,
  });
}

/** 就地修改：字段都是普通属性可以原地改，但 fill 引用没变 → set 缺席、不置 dirty */
function mutateGradientInPlace(
  gradient: Gradient<'linear' | 'radial'>,
  options: GradientLabOptions,
): void {
  const next = buildGradient(options);
  gradient.type = next.type;
  gradient.coords = next.coords;
  gradient.colorStops = next.colorStops;
}

function round(value: number): number {
  return Math.round(value);
}

export function createGradientLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: GradientLabSnapshot) => void,
): GradientLabInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  const initial: GradientLabOptions = {
    gradientType: 'linear',
    gradientAngle: 0,
    stopOffset: 0.5,
    radialR1: 0,
    focalShift: 0,
    objectAngle: 0,
    mutateInPlace: false,
    markDirty: false,
  };

  let sharedGradient: Gradient<'linear' | 'radial'> = buildGradient(initial);

  // 主矩形：承载渐变全部参数维度；originX/originY 默认 center，left/top 即中心点
  const rect = new Rect({
    left: INITIAL_SIZE.width * 0.32,
    top: INITIAL_SIZE.height * 0.46,
    width: MAIN_RECT.width,
    height: MAIN_RECT.height,
    fill: sharedGradient as TFiller,
    stroke: '#0f172a',
    strokeWidth: 1,
  });

  // 共享小圆：与主矩形共用同一个渐变实例（px 单位下按它自己的 88×88 局部坐标系呈现）
  const circle = new Circle({
    left: INITIAL_SIZE.width * 0.76,
    top: INITIAL_SIZE.height * 0.46,
    radius: 44,
    fill: sharedGradient as TFiller,
    stroke: '#0f172a',
    strokeWidth: 1,
  });

  fabricCanvas.add(rect, circle);

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
    // coords 是 linear / radial 两种形状的联合：'r1' in 收窄后分别读字段
    const coords = sharedGradient.coords;
    const coordsLabel =
      'r1' in coords
        ? `内圆(${round(coords.x1)},${round(coords.y1)}) r${round(coords.r1)} → 外圆(${round(coords.x2)},${round(coords.y2)}) r${round(coords.r2)}`
        : `(${round(coords.x1)},${round(coords.y1)}) → (${round(coords.x2)},${round(coords.y2)})`;
    emit({
      fillTypeLabel: `Gradient（${sharedGradient.type}）`,
      // id 是实例身份：换新实例会变，就地修改保持不变
      gradientId: String(sharedGradient.id),
      coordsLabel,
      stopsLabel: sharedGradient.colorStops
        .map((stop) => stop.offset)
        .join(' / '),
      updateModeLabel: current.mutateInPlace
        ? current.markDirty
          ? '就地修改 + 手动置 dirty'
          : '就地修改（未换实例）'
        : "换新实例 set('fill')",
      cacheRepaints,
      sharedLabel: rect.fill === circle.fill ? '同一实例' : '不同实例',
      serializedTypeLabel: String(sharedGradient.toObject().type),
    });
  }

  let current: GradientLabOptions = initial;

  function update(options: GradientLabOptions) {
    current = options;
    if (options.mutateInPlace) {
      // 引用不变：set 缺席，缓存位图保持旧画面
      mutateGradientInPlace(sharedGradient, options);
      if (options.markDirty) {
        rect.set('dirty', true);
        circle.set('dirty', true);
      }
    } else {
      // 换新实例：fill 引用变化 → set 自动置 dirty，下一帧重画缓存位图
      sharedGradient = buildGradient(options);
      rect.set('fill', sharedGradient);
      circle.set('fill', sharedGradient);
    }
    // angle 不在 cacheProperties：旋转在合成期应用，位图带着渐变一起转
    rect.set('angle', options.objectAngle);
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
    rect.set({ left: width * 0.32, top: height * 0.46 });
    circle.set({ left: width * 0.76, top: height * 0.46 });
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

/* -------------------------------------------------- 图案实验台 -------------------------------------------------- */

/** 读者输入：对应 Controls 面板（图案部分） */
export interface PatternLabOptions {
  /** 平铺模式 repeat：repeat / repeat-x / repeat-y / no-repeat（语义同 CSS background-repeat） */
  repeatMode: PatternRepeat;
  /** tile 尺寸（px）：生成对应大小的离屏 canvas 源 */
  tileSize: number;
  /** 图案水平偏移 offsetX：平铺锚点从对象左上角水平移动 */
  patternOffsetX: number;
  /** 图案垂直偏移 offsetY */
  patternOffsetY: number;
  /** patternTransform 旋转角（度）：以平铺锚点为原点旋转 tile */
  patternRotate: number;
  /** 对象旋转角（度）：图案随对象一起转（贴花式锚定） */
  objectAngle: number;
}

/** 派生读数：由 readout 显示 */
export interface PatternLabSnapshot {
  fillTypeLabel: string;
  repeatLabel: string;
  sourceKindLabel: string;
  tileSizeLabel: string;
  offsetLabel: string;
  transformLabel: string;
  serializedSourceLabel: string;
}

export interface PatternLabInstance {
  update(options: PatternLabOptions): void;
  dispose(): void;
}

const tileCache = new Map<number, HTMLCanvasElement>();

/** 程序化 tile：右下角黄色小方块让 tile 不对称，repeat-x / repeat-y 的方向差异才可观察 */
function getTile(size: number): HTMLCanvasElement {
  const cached = tileCache.get(size);
  if (cached) {
    return cached;
  }
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.fillRect(size * 0.62, size * 0.62, size * 0.26, size * 0.26);
  tileCache.set(size, tile);
  return tile;
}

function buildPattern(options: PatternLabOptions): Pattern {
  const rad = (options.patternRotate * Math.PI) / 180;
  // patternTransform 是 6 元矩阵 [a, b, c, d, e, f]；这里用旋转矩阵
  const patternTransform: TMat2D | undefined =
    options.patternRotate === 0
      ? undefined
      : [
          Math.cos(rad),
          Math.sin(rad),
          -Math.sin(rad),
          Math.cos(rad),
          0,
          0,
        ];
  return new Pattern({
    source: getTile(options.tileSize),
    repeat: options.repeatMode,
    offsetX: options.patternOffsetX,
    offsetY: options.patternOffsetY,
    patternTransform,
  });
}

export function createPatternLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: PatternLabSnapshot) => void,
): PatternLabInstance {
  const fabricCanvas = new Canvas(canvasEl, {
    ...INITIAL_SIZE,
    backgroundColor: '#ffffff',
  });

  const initial: PatternLabOptions = {
    repeatMode: 'repeat',
    tileSize: 48,
    patternOffsetX: 0,
    patternOffsetY: 0,
    patternRotate: 0,
    objectAngle: 0,
  };

  // 主矩形与小圆共享同一个 Pattern：平铺各自锚定在自己的左上角
  const rect = new Rect({
    left: INITIAL_SIZE.width * 0.34,
    top: INITIAL_SIZE.height * 0.48,
    width: 224,
    height: 224,
    fill: buildPattern(initial),
    stroke: '#0f172a',
    strokeWidth: 1,
  });
  const circle = new Circle({
    left: INITIAL_SIZE.width * 0.78,
    top: INITIAL_SIZE.height * 0.48,
    radius: 52,
    fill: rect.fill,
    stroke: '#0f172a',
    strokeWidth: 1,
  });

  fabricCanvas.add(rect, circle);

  function emitSnapshot() {
    const pattern = rect.fill instanceof Pattern ? rect.fill : null;
    if (!pattern) {
      return;
    }
    // 序列化证据：canvas 源经 toDataURL 变成 data:image/png;base64 字符串
    const serialized = pattern.sourceToString();
    const tile = getTile(current.tileSize);
    emit({
      fillTypeLabel: `Pattern（id ${pattern.id}）`,
      repeatLabel: pattern.repeat,
      sourceKindLabel: pattern.isCanvasSource()
        ? 'canvas 元素（isCanvasSource）'
        : pattern.isImageSource()
          ? 'img 元素（isImageSource）'
          : '其他',
      tileSizeLabel: `${tile.width}×${tile.height}`,
      offsetLabel: `${pattern.offsetX} / ${pattern.offsetY}`,
      transformLabel: pattern.patternTransform
        ? `已设置（旋转 ${current.patternRotate}°）`
        : '未设置',
      serializedSourceLabel: `${serialized.slice(0, 15)}…（长度 ${serialized.length}）`,
    });
  }

  let current: PatternLabOptions = initial;

  function update(options: PatternLabOptions) {
    current = options;
    // 每次换新 Pattern 实例赋值：fill 引用变化自动置 dirty，重画缓存位图
    const pattern = buildPattern(options);
    rect.set('fill', pattern);
    circle.set('fill', pattern);
    rect.set('angle', options.objectAngle);
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
    rect.set({ left: width * 0.34, top: height * 0.48 });
    circle.set({ left: width * 0.78, top: height * 0.48 });
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
