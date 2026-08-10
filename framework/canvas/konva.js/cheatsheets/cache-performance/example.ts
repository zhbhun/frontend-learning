/**
 * 演示内容：缓存（cache）对绘制性能的影响。
 *
 * 一个星形矩阵铺满舞台——每个星形带填充、描边和阴影，构成「绘制成本高」的节点。
 * 读者通过 Controls 切换「缓存」开关和「形状数量」，直接观察单帧绘制耗时的变化：
 *   - 缓存关闭：每次 draw() 都要逐条执行 fill + stroke + shadow 指令。
 *   - 缓存开启：每个星形预渲染成离屏图像，draw() 直接复制图像。
 *
 * 测量方法：同步调用 layer.draw() 多次取平均。layer 设 listening:false 跳过命中图
 *   重绘，让测量聚焦于 scene canvas 的渲染成本——这正是 cache 优化的部分。
 *
 * 输入：cached（是否缓存）、shapeCount（星形数量）。
 * 预期：开启缓存后绘制耗时显著下降；形状越多，缓存收益越明显。
 * 阅读主线：建星形矩阵 → 切换 cache()/clearCache() → 对比绘制耗时。
 *
 * canvasStory 的适配（关键）：
 * canvasStory 创建 div.cs-stage > canvas 并把 canvas 传给 create，同时把读数放在
 * cs-stage 里。Konva.Stage 需要一个 container，但 Stage 构造会清空 container，因此
 * 隐藏占位 canvas，再新建一个独立包裹层交给 Stage（与 architecture、drag-and-drop 一致）。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface CachePerformanceOptions {
  /** 是否缓存：true 对每个星形调用 cache()，false 调用 clearCache()。 */
  cached: boolean;
  /** 星形数量：越多越能体现缓存的收益。 */
  shapeCount: number;
}

export interface CachePerformanceSnapshot {
  /** 当前缓存状态。 */
  cached: boolean;
  /** 场景中的星形数量。 */
  shapeCount: number;
  /** 单次 layer.draw() 的平均耗时（毫秒）。 */
  drawTime: number;
}

export interface CachePerformanceInstance {
  update(options: CachePerformanceOptions): void;
  dispose(): void;
}

// 视觉常量：6 色循环填充，让矩阵有视觉层次。
const FILL_COLORS = [
  '#4f7cff',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

export function createCachePerformanceDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CachePerformanceSnapshot) => void,
): CachePerformanceInstance {
  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

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

  // listening:false 跳过命中图：本课聚焦 scene canvas 的渲染成本（cache 优化的部分），
  // 关闭命中图后 layer.draw() 只重绘可见画面，测量值更纯粹。
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  let stars: Konva.Star[] = [];
  let currentCached = false;
  let currentCount = 0;

  // 按数量构建星形矩阵：自动计算行列数，让星形均匀铺满舞台。
  function buildStars(count: number) {
    for (const star of stars) {
      star.destroy();
    }
    stars = [];

    const w = stage.width();
    const h = stage.height();
    const cols = Math.max(1, Math.ceil(Math.sqrt((count * w) / h)));
    const rows = Math.max(1, Math.ceil(count / cols));
    const cellW = w / cols;
    const cellH = h / rows;
    const radius = Math.max(3, Math.min(cellW, cellH) * 0.34);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // 每个星形带 fill + stroke + shadow + opacity，构成「绘制成本高」的复杂节点。
      const star = new Konva.Star({
        x: cellW * (col + 0.5),
        y: cellH * (row + 0.5),
        numPoints: 5,
        innerRadius: radius * 0.5,
        outerRadius: radius,
        fill: FILL_COLORS[i % FILL_COLORS.length],
        stroke: '#1e293b',
        strokeWidth: 1,
        shadowColor: 'rgba(15, 23, 42, 0.28)',
        shadowBlur: 5,
        shadowOffsetY: 1,
        opacity: 0.92,
        listening: false,
      });
      layer.add(star);
      stars.push(star);
    }

    currentCount = count;

    // 保持当前缓存状态：对新创建的星形也应用缓存。
    if (currentCached) {
      for (const star of stars) {
        star.cache();
      }
    }
  }

  // 切换缓存：对所有星形统一 cache() 或 clearCache()。
  function applyCache(cached: boolean) {
    if (cached === currentCached) {
      return;
    }
    currentCached = cached;
    for (const star of stars) {
      if (cached) {
        star.cache();
      } else {
        star.clearCache();
      }
    }
  }

  // 测量单次 layer.draw() 的平均耗时：同步多次取平均，数值更稳定。
  // 形状多时减少迭代次数，避免阻塞主线程过久。
  function measureDraw(): number {
    const iterations =
      currentCount > 1000 ? 3 : currentCount > 500 ? 5 : 10;
    // 预热一次，避免首次绘制的冷启动偏差。
    layer.draw();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      layer.draw();
    }
    return (performance.now() - start) / iterations;
  }

  function emitSnapshot() {
    emit({
      cached: currentCached,
      shapeCount: currentCount,
      drawTime: Math.round(measureDraw() * 100) / 100,
    });
  }

  function layout() {
    const next = readCanvasSize(canvas);
    stage.width(next.width);
    stage.height(next.height);
    buildStars(currentCount || 500);
    emitSnapshot();
  }

  layout();

  const resizeObserver = createResizeObserver(canvas, layout);

  return {
    update(options) {
      if (options.shapeCount !== currentCount) {
        buildStars(options.shapeCount);
      }
      applyCache(options.cached);
      emitSnapshot();
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
