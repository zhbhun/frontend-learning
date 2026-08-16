/**
 * 范例介绍：滤镜实验台 + 高质量缩放两个画布，核对 FabricImage 的滤镜管线——
 * 1. 实验台：image.filters 数组装滤镜实例，applyFilters() 显式重算并把结果写进滤镜副本；
 *    中性态滤镜被 isNeutralState() 跳过；Composed 按官方 duotone 套路组合子滤镜；
 *    SwapColor 是官方 custom-filter demo 的自定义滤镜模板（applyTo2d 与 shader 双路径）。
 *    readout 给生效滤镜链与参数快照、被跳过的中性滤镜数、后端类型（WebGL/2D）、渲染元素状态。
 * 2. 缩放：resizeFilter 是独立于 filters 的缩放通道，scale 低于 minimumScaleTrigger（0.5）
 *    时在渲染中自动触发；对比关闭与 lanczos / bilinear / hermite 的清晰度差异。
 * 输入：滤镜选择、强度、组合开关、显示倍率、resize 模式，全部由 Controls 提供。
 * 前置状态：源图由本地离屏 canvas 生成（色相渐变 + 纯色块 + 细网格），不依赖外网。
 * 预期结果：画面变化与 readout 逐项对应；色调类强度滑到 50（参数归 0）能看到“中性被跳过”。
 * 阅读主线：SwapColor 类对应“自定义滤镜”小节；createFilterBench / createResizeDemo 对应两个 Canvas。
 */
import {
  Canvas,
  Color,
  FabricImage,
  FabricText,
  Rect,
  filters,
  getFilterBackend,
  WebGLFilterBackend,
} from 'fabric';
import type {
  T2DPipelineState,
  TWebGLUniformLocationMap,
} from 'fabric';
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// 自定义滤镜：官方 custom-filter demo 的 SwapColor 模板（v7 形态）
// ---------------------------------------------------------------------------

type SwapColorOwnProps = {
  colorSource: string;
  colorDestination: string;
};

/** WebGL 路径的 fragment shader：uTexture / vTexCoord 由基类管线提供 */
const swapColorFragmentSource = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec4 uColorSource;
  uniform vec4 uColorDestination;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    vec3 delta = abs(uColorSource.rgb - color.rgb);
    gl_FragColor = length(delta) < 0.1 ? uColorDestination : color;
  }
`;

class SwapColor extends filters.BaseFilter<'SwapColor', SwapColorOwnProps> {
  static type = 'SwapColor';

  /** 构造器会 Object.assign(this, 静态 defaults, options)：默认值在这里给 */
  static defaults = {
    colorSource: '#ef4444',
    colorDestination: '#22d3ee',
  };

  declare colorSource: string;
  declare colorDestination: string;

  /** 基类按这份名单到 shader 程序里查 uniform 位置 */
  static uniformLocations = ['uColorSource', 'uColorDestination'];

  protected getFragmentSource() {
    return swapColorFragmentSource;
  }

  /** Canvas 2D 兜底路径：直接改 imageData 像素，色彩分量是 0-255 量纲 */
  applyTo2d({ imageData: { data } }: T2DPipelineState) {
    const source = new Color(this.colorSource).getSource();
    const destination = new Color(this.colorDestination).getSource();
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i] === source[0] &&
        data[i + 1] === source[1] &&
        data[i + 2] === source[2]
      ) {
        data[i] = destination[0];
        data[i + 1] = destination[1];
        data[i + 2] = destination[2];
      }
    }
  }

  /** WebGL 路径：把颜色送进 uniform，色彩分量要除以 255 归一化到 0-1 */
  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap,
  ) {
    const source = new Color(this.colorSource).getSource();
    const destination = new Color(this.colorDestination).getSource();
    source[0] /= 255;
    source[1] /= 255;
    source[2] /= 255;
    destination[0] /= 255;
    destination[1] /= 255;
    destination[2] /= 255;
    gl.uniform4fv(uniformLocations.uColorSource, source);
    gl.uniform4fv(uniformLocations.uColorDestination, destination);
  }

  /** 源色与目标色相同时不产生效果：声明中性态，applyFilters 会跳过 */
  isNeutralState(): boolean {
    return this.colorSource === this.colorDestination;
  }
}

// ---------------------------------------------------------------------------
// 范例 1：滤镜实验台——切滤镜 / 调强度 / 组合开关
// ---------------------------------------------------------------------------

export type FilterKind =
  | 'none'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'vibrance'
  | 'hueRotation'
  | 'blur'
  | 'noise'
  | 'pixelate'
  | 'removeColor'
  | 'sepia'
  | 'vintage'
  | 'duotone'
  | 'swapColor';

export interface FilterBenchOptions {
  filterKind: FilterKind;
  intensity: number;
  stackGrayscale: boolean;
}

export interface FilterBenchSnapshot {
  filterList: string;
  neutralSkipped: string;
  backend: string;
  elementState: string;
}

export interface FilterBenchInstance {
  update(options: FilterBenchOptions): void;
  dispose(): void;
}

interface ChainEntry {
  filter: filters.BaseFilter<string>;
  label: string;
}

/** 色调类参数归一化到 -1..1：强度 50 = 0 = 默认值 = 中性态 */
function signedValue(t: number) {
  return round2(t / 50 - 1);
}

/**
 * 生成本地测试图：上 2/3 水平色相渐变（色调类滤镜可观察），
 * 下 1/3 纯色块（含白/黑/红，服务 RemoveColor 与 SwapColor），
 * 全图覆盖 16px 细网格（Blur / Pixelate / Convolute 的细节基准）。
 */
function createBenchSource(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#ef4444');
  gradient.addColorStop(0.2, '#f59e0b');
  gradient.addColorStop(0.4, '#22c55e');
  gradient.addColorStop(0.6, '#06b6d4');
  gradient.addColorStop(0.8, '#3b82f6');
  gradient.addColorStop(1, '#a855f7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, (height * 2) / 3);

  const swatches = ['#ffffff', '#0f172a', '#ef4444', '#22c55e', '#3b82f6'];
  const blockWidth = width / swatches.length;
  swatches.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      index * blockWidth,
      (height * 2) / 3,
      blockWidth,
      height / 3,
    );
  });

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 16; x < width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 16; y < height; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  return el;
}

/** 按当前输入重建滤镜链：强度滑条 0-100 统一映射到各滤镜的真实量纲 */
function buildFilterChain(options: FilterBenchOptions): ChainEntry[] {
  const t = options.intensity;
  switch (options.filterKind) {
    case 'none':
      return [];
    case 'brightness': {
      const value = signedValue(t);
      return [
        {
          filter: new filters.Brightness({ brightness: value }),
          label: `Brightness { brightness: ${value} }`,
        },
      ];
    }
    case 'contrast': {
      const value = signedValue(t);
      return [
        {
          filter: new filters.Contrast({ contrast: value }),
          label: `Contrast { contrast: ${value} }`,
        },
      ];
    }
    case 'saturation': {
      const value = signedValue(t);
      return [
        {
          filter: new filters.Saturation({ saturation: value }),
          label: `Saturation { saturation: ${value} }`,
        },
      ];
    }
    case 'vibrance': {
      const value = signedValue(t);
      return [
        {
          filter: new filters.Vibrance({ vibrance: value }),
          label: `Vibrance { vibrance: ${value} }`,
        },
      ];
    }
    case 'hueRotation': {
      const value = signedValue(t);
      return [
        {
          filter: new filters.HueRotation({ rotation: value }),
          label: `HueRotation { rotation: ${value} }`,
        },
      ];
    }
    case 'blur': {
      const value = round2(t / 100);
      return [
        {
          filter: new filters.Blur({ blur: value }),
          label: `Blur { blur: ${value} }`,
        },
      ];
    }
    case 'noise': {
      const value = Math.round(t * 6);
      return [
        {
          filter: new filters.Noise({ noise: value }),
          label: `Noise { noise: ${value} }`,
        },
      ];
    }
    case 'pixelate': {
      const value = Math.max(1, Math.round(t / 2.5));
      return [
        {
          filter: new filters.Pixelate({ blocksize: value }),
          label: `Pixelate { blocksize: ${value} }`,
        },
      ];
    }
    case 'removeColor': {
      const value = round2(t / 100);
      return [
        {
          filter: new filters.RemoveColor({
            color: '#ffffff',
            distance: value,
          }),
          label: `RemoveColor { color: #ffffff, distance: ${value} }`,
        },
      ];
    }
    case 'sepia':
      return [
        {
          filter: new filters.Sepia(),
          label: 'Sepia()（固定颜色矩阵预设，无参）',
        },
      ];
    case 'vintage':
      return [
        {
          filter: new filters.Vintage(),
          label: 'Vintage()（固定颜色矩阵预设，无参）',
        },
      ];
    case 'duotone':
      return [
        {
          filter: new filters.Composed({
            subFilters: [
              // 官方 duotone demo 的三步套路：黑白 → 亮色 multiply → 暗色 lighten
              new filters.Grayscale({ mode: 'luminosity' }),
              new filters.BlendColor({ color: '#00ff36' }),
              new filters.BlendColor({ color: '#23278a', mode: 'lighten' }),
            ],
          }),
          label:
            'Composed { Grayscale + BlendColor(#00ff36) + BlendColor(#23278a, lighten) }',
        },
      ];
    case 'swapColor':
      return [
        {
          filter: new SwapColor(),
          label: 'SwapColor { #ef4444 → #22d3ee }（自定义）',
        },
      ];
  }
}

export function createFilterBench(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: FilterBenchSnapshot) => void,
): FilterBenchInstance {
  let stageSize = { ...INITIAL_SIZE };

  const stage = setupStage(canvasEl, (width, height) => {
    stageSize = { width, height };
    stage.fabricCanvas.setDimensions({ width, height });
    layout();
    stage.fabricCanvas.requestRenderAll();
  });

  const source = createBenchSource(320, 240);

  // 背板：RemoveColor 把白色抠成透明后，透出的是这层颜色
  const backdrop = new Rect({
    width: 320,
    height: 240,
    originX: 'center',
    originY: 'center',
    fill: '#94a3b8',
    selectable: false,
    evented: false,
  });
  const image = new FabricImage(source, {
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  const caption = createCaption(
    '滤镜实验台：切滤镜 / 调强度 / 勾选组合；读数给出滤镜链快照与后端类型',
    16,
    12,
  );
  stage.fabricCanvas.add(caption, backdrop, image);

  // 后端在首次 getFilterBackend() 时定型（本例即首次滤镜调用前后不变）
  const backendName =
    getFilterBackend() instanceof WebGLFilterBackend
      ? 'WebGLFilterBackend（GPU）'
      : 'Canvas2dFilterBackend（CPU 兜底）';

  function layout() {
    const left = stageSize.width / 2;
    const top = stageSize.height * 0.55;
    backdrop.set({ left, top });
    image.set({ left, top });
  }
  layout();

  return {
    update(options) {
      const entries = buildFilterChain(options);
      if (options.stackGrayscale) {
        entries.push({
          filter: new filters.Grayscale(),
          label: 'Grayscale()',
        });
      }
      // 数组即管线：元素顺序就是滤镜应用顺序
      image.filters = entries.map((entry) => entry.filter);
      // 改动不会自动生效：显式 applyFilters() 才把结果写进滤镜副本
      image.applyFilters();
      // 同步渲染保证下方读数读到的是本次滤镜后的元素状态
      stage.fabricCanvas.renderAll();

      const neutralCount = entries.filter((entry) =>
        entry.filter.isNeutralState(),
      ).length;
      emit({
        filterList: entries.length
          ? entries.map((entry) => entry.label).join(' + ')
          : '（空数组）',
        neutralSkipped: `${neutralCount} 个`,
        backend: backendName,
        elementState:
          image.getElement() === source
            ? '原图元素（链为空或全部中性）'
            : '滤镜副本（_element 已与原图分离）',
      });
    },
    dispose() {
      // 先释放图片：连带清掉 WebGL 纹理缓存（cacheKey 对应的纹理）
      image.dispose();
      stage.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// 范例 2：resizeFilter 与高质量缩放——scale 低于 0.5 时自动触发
// ---------------------------------------------------------------------------

export type ResizeMode = 'off' | 'lanczos' | 'bilinear' | 'hermite';

export interface ResizeDemoOptions {
  displayScale: number;
  resizeMode: ResizeMode;
}

export interface ResizeDemoSnapshot {
  scale: string;
  resizeState: string;
  filterScale: string;
  displaySize: string;
}

export interface ResizeDemoInstance {
  update(options: ResizeDemoOptions): void;
  dispose(): void;
}

/** 高细节测试图：8px 细网格 + 斜线 + 圆环，缩小时的锯齿 / 摩尔纹差异肉眼可辨 */
function createDetailSource(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 1;
  for (let x = 8; x < width; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 8; y < height; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  for (let offset = -height; offset < width; offset += 48) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + height, height);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, 0, Math.PI * 2);
  ctx.stroke();
  return el;
}

const DETAIL_SIZE = { width: 480, height: 360 };

export function createResizeDemo(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: ResizeDemoSnapshot) => void,
): ResizeDemoInstance {
  let stageSize = { ...INITIAL_SIZE };

  const stage = setupStage(canvasEl, (width, height) => {
    stageSize = { width, height };
    stage.fabricCanvas.setDimensions({ width, height });
    layout();
    stage.fabricCanvas.requestRenderAll();
  });

  const source = createDetailSource(DETAIL_SIZE.width, DETAIL_SIZE.height);
  const image = new FabricImage(source, {
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
  });
  const caption = createCaption(
    '高质量缩放：scale < 0.5 时 resizeFilter 介入；对比关闭与各算法的清晰度',
    16,
    12,
  );
  stage.fabricCanvas.add(caption, image);

  function layout() {
    image.set({
      left: stageSize.width / 2,
      top: stageSize.height * 0.55,
    });
  }
  layout();

  return {
    update(options) {
      // resizeFilter 是独立通道：不在 filters 数组里，直接挂在属性上（off = 移除）
      image.resizeFilter =
        options.resizeMode === 'off'
          ? undefined
          : new filters.Resize({ resizeType: options.resizeMode });
      image.set({
        scaleX: options.displayScale,
        scaleY: options.displayScale,
      });
      // 渲染只在 scale 变化时自动触发 resizeFilter；本范例在固定倍率下切换算法，
      // 必须显式调 applyResizeFilters() 才会用新实例重采样（正文「Resize 与高质量缩放」）
      image.applyResizeFilters();
      // 同步渲染：保证下方读数读到的是本次缩放后的元素状态
      stage.fabricCanvas.renderAll();

      const triggered =
        Boolean(image.resizeFilter) &&
        options.displayScale < image.minimumScaleTrigger;
      const original = image.getOriginalSize();
      const element = image.getElement();
      emit({
        scale: `${round2(options.displayScale)}`,
        resizeState: image.resizeFilter
          ? `${options.resizeMode}${
              triggered ? '（已触发：scale < 0.5）' : '（未触发：scale ≥ 0.5）'
            }`
          : 'off（直接按倍率绘制源图）',
        // 元素宽 / 原始宽：resizeFilter 实际落在元素上的缩放比（未触发时为 1）
        filterScale: round2(element.width / original.width),
        displaySize: `${Math.round(image.getScaledWidth())}×${Math.round(
          image.getScaledHeight(),
        )}`,
      });
    },
    dispose() {
      image.dispose();
      stage.dispose();
    },
  };
}
