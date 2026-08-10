/**
 * 范例介绍：演示 Konva 滤镜的工作机制——缓存（cache）→ 滤镜数组（filters）→ 参数调节。
 *
 * 两个独立实例共享同一个多彩场景（渐变背景 + 圆 + 星 + 环 + 文本），让颜色、结构与
 * 边缘变化在不同滤镜下都清晰可见：
 *
 * 1. createFilterDemo：切换 9 种代表性内置滤镜（模糊、像素化、噪点、亮度、对比度、
 *    灰度、反色、棕褐、阈值），用「强度」滑块调节参数。切换滤镜或调参时只更新 filters
 *    数组与参数值，不重新 cache——读数「缓存次数」始终保持 1，印证「改参数无需重缓存」。
 * 2. createCombineDemo：同一场景同时叠加 Blur + Brighten + Contrast 三个滤镜，
 *    展示滤镜按 filters 数组顺序链式处理。
 *
 * 关键模型：函数型滤镜操作的是节点 cache() 生成的离屏像素位图——没有 cache() 就没有
 * 像素可供处理。改参数只触发从同一缓存源重新跑滤镜管线；改内容（尺寸、子节点、变换）
 * 才需重缓存。所有滤镜参数（blurRadius、brightness、contrast 等）都是 Node 上的
 * GetSet 属性，Group 继承可用。
 * 输入：update(options) 应用滤镜与参数后用 layer.batchDraw() 重绘；尺寸变化时更新
 * stage 宽高。
 * 预期：切换滤镜 / 调强度 / 组合滤镜，画面效果与读数同步变化。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 选择器中暴露的 9 种代表性滤镜，覆盖结构、颜色与风格化三类。 */
export const FILTER_NAMES = [
  'Blur',
  'Pixelate',
  'Noise',
  'Brighten',
  'Contrast',
  'Grayscale',
  'Invert',
  'Sepia',
  'Threshold',
] as const;

/**
 * 在 group 上构建一个多彩场景，供滤镜处理时能看出明显的颜色、结构与边缘变化。
 * 所有子节点关闭命中检测（listening: false），本范例不需要交互。
 */
function buildScene(group: Konva.Group, w: number, h: number) {
  group.removeChildren();

  // 渐变背景
  group.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: w,
      height: h,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: w, y: h },
      fillLinearGradientColorStops: [
        0,
        '#1e3a8a',
        0.5,
        '#7c3aed',
        1,
        '#be185d',
      ],
      listening: false,
    }),
  );

  const base = Math.min(w, h);

  // 黄色圆（右上）
  group.add(
    new Konva.Circle({
      x: w * 0.74,
      y: h * 0.32,
      radius: base * 0.14,
      fill: '#fbbf24',
      stroke: '#f59e0b',
      strokeWidth: 3,
      listening: false,
    }),
  );

  // 红色五角星（左侧）
  group.add(
    new Konva.Star({
      x: w * 0.24,
      y: h * 0.38,
      numPoints: 5,
      innerRadius: base * 0.09,
      outerRadius: base * 0.18,
      fill: '#ef4444',
      stroke: '#991b1b',
      strokeWidth: 2,
      listening: false,
    }),
  );

  // 绿色环（中央）
  group.add(
    new Konva.Ring({
      x: w * 0.5,
      y: h * 0.52,
      innerRadius: base * 0.1,
      outerRadius: base * 0.17,
      fill: '#10b981',
      listening: false,
    }),
  );

  // 白色文本「FILTER」
  const label = new Konva.Text({
    text: 'FILTER',
    fontSize: Math.round(base * 0.16),
    fontStyle: 'bold',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fill: '#ffffff',
    listening: false,
  });
  label.x((w - label.width()) / 2);
  label.y(h * 0.72);
  group.add(label);
}

/* ===================== 单滤镜探索实例 ===================== */

export interface FilterOptions {
  /** 滤镜名（取自 FILTER_NAMES）。 */
  filter: string;
  /** 强度 0–1，映射到各滤镜的具体参数范围。 */
  intensity: number;
}

export interface FilterSnapshot {
  filter: string;
  /** 当前滤镜的具体参数表示（如 blurRadius = 20），无参数滤镜显示「无参数」。 */
  param: string;
  /** cache() 被调用的累计次数——改参数不递增，印证无需重缓存。 */
  cacheCount: number;
}

export interface FilterInstance {
  update(options: FilterOptions): void;
  dispose(): void;
}

export function createFilterDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FilterSnapshot) => void,
): FilterInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  const group = new Konva.Group({ listening: false });
  layer.add(group);

  let current: FilterOptions = { filter: 'Blur', intensity: 0.5 };
  let sceneBuilt = false;
  let cacheCount = 0;

  /** 从 Konva.Filters 按名称取滤镜函数（Filter 类型未从命名空间导出，用 typeof 推断）。 */
  function getFilterFn(name: string): typeof Konva.Filters.Blur {
    const filters = Konva.Filters as unknown as Record<
      string,
      typeof Konva.Filters.Blur
    >;
    return filters[name];
  }

  /**
   * 把 0–1 的强度映射到各滤镜的实际参数范围并应用到节点。
   * 返回可读的参数描述字符串，供读数显示。
   */
  function applyFilter(): string {
    const fn = getFilterFn(current.filter);
    group.filters([fn]);

    switch (current.filter) {
      case 'Blur': {
        const v = Math.round(current.intensity * 40);
        group.blurRadius(v);
        return `blurRadius = ${v}`;
      }
      case 'Pixelate': {
        const v = Math.max(1, Math.round(current.intensity * 20));
        group.pixelSize(v);
        return `pixelSize = ${v}`;
      }
      case 'Noise': {
        group.noise(current.intensity);
        return `noise = ${current.intensity.toFixed(2)}`;
      }
      case 'Brighten': {
        group.brightness(current.intensity);
        return `brightness = ${current.intensity.toFixed(2)}`;
      }
      case 'Contrast': {
        const v = Math.round(current.intensity * 100);
        group.contrast(v);
        return `contrast = ${v}`;
      }
      case 'Threshold': {
        group.threshold(current.intensity);
        return `threshold = ${current.intensity.toFixed(2)}`;
      }
      default:
        // Grayscale / Invert / Sepia 无参数
        return '无参数';
    }
  }

  function rebuild() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    // 首次构建场景并缓存；之后改滤镜或调参不重新缓存——读数 cacheCount 保持不变。
    if (!sceneBuilt) {
      const sceneW = Math.max(320, width);
      const sceneH = Math.max(220, height);
      buildScene(group, sceneW, sceneH);
      // offset 给 Blur 等边缘扩散型滤镜留出像素余量，减少硬切边。
      group.cache({
        x: 0,
        y: 0,
        width: sceneW,
        height: sceneH,
        offset: 10,
      });
      cacheCount++;
      sceneBuilt = true;
    }

    const param = applyFilter();
    layer.batchDraw();
    emit({
      filter: current.filter,
      param,
      cacheCount,
    });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    // 尺寸变化时只更新 stage 宽高；场景已缓存为位图，滤镜仍作用于该位图。
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);
    layer.batchDraw();
  });

  return {
    update(options) {
      current = options;
      rebuild();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}

/* ===================== 组合滤镜实例 ===================== */

export interface CombineOptions {
  /** Blur 的 blurRadius，0–40。 */
  blurRadius: number;
  /** Brighten 的 brightness，-1–1（这里用 0–1 做增亮）。 */
  brightness: number;
  /** Contrast 的 contrast，-100–100。 */
  contrast: number;
}

export interface CombineSnapshot {
  /** 当前滤镜链（按应用顺序）。 */
  chain: string;
  blurRadius: number;
  brightness: number;
  contrast: number;
}

export interface CombineInstance {
  update(options: CombineOptions): void;
  dispose(): void;
}

export function createCombineDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CombineSnapshot) => void,
): CombineInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // 同 createFilterDemo：用独立包裹层承接 Konva.Stage，避免建台时清掉读数。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  const group = new Konva.Group({ listening: false });
  layer.add(group);

  let current: CombineOptions = {
    blurRadius: 6,
    brightness: 0.15,
    contrast: 25,
  };
  let sceneBuilt = false;

  function applyFilters() {
    // 滤镜按数组顺序链式处理：每个滤镜接手的是上一个滤镜的输出像素。
    group.filters([
      Konva.Filters.Blur,
      Konva.Filters.Brighten,
      Konva.Filters.Contrast,
    ]);
    group.blurRadius(current.blurRadius);
    group.brightness(current.brightness);
    group.contrast(current.contrast);
  }

  function rebuild() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    if (!sceneBuilt) {
      const sceneW = Math.max(320, width);
      const sceneH = Math.max(220, height);
      buildScene(group, sceneW, sceneH);
      group.cache({
        x: 0,
        y: 0,
        width: sceneW,
        height: sceneH,
        offset: 10,
      });
      sceneBuilt = true;
    }

    applyFilters();
    layer.batchDraw();
    emit({
      chain: 'Blur → Brighten → Contrast',
      blurRadius: current.blurRadius,
      brightness: current.brightness,
      contrast: current.contrast,
    });
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);
    layer.batchDraw();
  });

  return {
    update(options) {
      current = options;
      rebuild();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
