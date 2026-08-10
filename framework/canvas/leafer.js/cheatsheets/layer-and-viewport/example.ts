/**
 * 范例介绍：演示 App 多 Layer 分层渲染，以及通过内容层的 zoomLayer 视口缩放平移视图，
 * 并读出固定内容点在屏幕（世界）坐标系下的位置。
 *
 * 输入 / 前置：
 *   - canvasStory 提供的 <canvas>，直接作为 App 的 view（单画布 realCanvas 模式）。
 *   - 引入 @leafer-in/view（2.2.9 包名；官方新文档亦称 @leafer-in/viewport），
 *     以获得 Leafer.prototype.zoom 等“视图控制”方法，本例用类型 'block' 手动驱动视口。
 *
 * 主要操作：
 *   - 创建 App，含 ground（背景层，type:'draw' 纯绘制无交互）与 tree（内容层）两层；
 *     ground 画坐标网格，tree 放若干图形与一个标记点 P。
 *   - update() 按控件设置 app.tree.zoomLayer 的 scaleX/scaleY/x/y 控制视口；
 *     layerSync 打开时把同一变换同步到 ground，演示层间坐标映射（背景跟随内容）。
 *
 * 预期结果：
 *   - 拖动缩放 / 平移控件 → 内容随视口缩放平移，左下角读数同步；
 *   - layerSync 关闭时背景网格静止、内容相对网格移动，证明 ground 与 tree 是独立层；
 *   - P 的内容坐标恒定，屏幕坐标随视口变化，体现内容坐标 ↔ 世界坐标的映射。
 *
 * 阅读主线：createLayerViewport → applyViewport（视口变换 + 层间同步）→ emitReadout。
 */
import { App, Rect, Ellipse, Star, Text, Path } from 'leafer-ui';
import '@leafer-in/view';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface LayerViewportOptions {
  /** 视口缩放比例 */
  scale: number;
  /** 视口水平平移（世界坐标系） */
  panX: number;
  /** 视口垂直平移（世界坐标系） */
  panY: number;
  /** 是否让 ground 背景层跟随 tree 视口（演示层间坐标同步） */
  layerSync: boolean;
}

export interface LayerViewportSnapshot {
  scale: number;
  panX: number;
  panY: number;
  groundScale: number;
  markerContentX: number;
  markerContentY: number;
  markerWorldX: number;
  markerWorldY: number;
}

export interface LayerViewportInstance {
  update(options: LayerViewportOptions): void;
  dispose(): void;
}

/** 标记点 P 在内容层（tree / page 坐标系）下的固定坐标 */
const MARKER_X = 240;
const MARKER_Y = 160;
/** 背景网格覆盖区域与步距 */
const GRID_W = 480;
const GRID_H = 320;
const GRID_STEP = 40;

/** 用一条 Path 画出整张坐标网格，避免大量节点 */
function gridPath(width: number, height: number, step: number): string {
  let d = '';
  for (let x = 0; x <= width; x += step) d += `M${x} 0 L${x} ${height} `;
  for (let y = 0; y <= height; y += step) d += `M0 ${y} L${width} ${y} `;
  return d.trim();
}

export function createLayerViewport(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LayerViewportSnapshot) => void,
): LayerViewportInstance {
  const initial = readCanvasSize(canvas);

  const app = new App({
    view: canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    fill: '#f8fafc',
    // ground：背景层，type:'draw' 表示纯绘制层，不参与命中交互
    ground: { type: 'draw' },
    // tree：内容层，默认 block 类型；本例手动驱动其 zoomLayer，不启用内置滚轮视口
    tree: {},
  });

  // === 背景层：坐标网格 ===
  app.ground.add(
    new Path({
      path: gridPath(GRID_W, GRID_H, GRID_STEP),
      stroke: '#dbe3f0',
      strokeWidth: 1,
    }),
  );
  app.ground.add(
    new Text({
      x: 6,
      y: GRID_H + 8,
      text: 'ground 背景层 · 坐标网格',
      fill: '#94a3b8',
      fontSize: 12,
    }),
  );

  // === 内容层：图形 + 标记点 P ===
  app.tree.add(
    new Rect({
      x: 120,
      y: 80,
      width: 240,
      height: 160,
      fill: '#eef2ff',
      stroke: '#4f7cff',
      strokeWidth: 2,
      cornerRadius: 12,
    }),
  );
  app.tree.add(
    new Ellipse({
      x: 150,
      y: 110,
      width: 70,
      height: 70,
      fill: '#4f7cff',
      cornerRadius: 35,
    }),
  );
  app.tree.add(
    new Star({
      x: 260,
      y: 120,
      width: 70,
      height: 70,
      corners: 5,
      innerRadius: 0.5,
      fill: '#f59e0b',
    }),
  );
  app.tree.add(
    new Text({
      x: 128,
      y: 200,
      text: 'tree 内容层',
      fill: '#1e293b',
      fontSize: 14,
      fontWeight: 600,
    }),
  );

  // 标记点 P：固定在内容坐标 (MARKER_X, MARKER_Y)
  app.tree.add(
    new Ellipse({
      x: MARKER_X - 7,
      y: MARKER_Y - 7,
      width: 14,
      height: 14,
      fill: '#ef4444',
      stroke: '#ffffff',
      strokeWidth: 2,
      cornerRadius: 7,
    }),
  );
  app.tree.add(
    new Text({
      x: MARKER_X + 12,
      y: MARKER_Y - 10,
      text: 'P',
      fill: '#ef4444',
      fontSize: 14,
      fontWeight: 700,
    }),
  );

  // 把当前视口参数推送到读数；标记点的屏幕坐标由 tree 视口变换线性映射得到
  // （等价于 marker.getBounds('box', 'world')，本层无旋转，公式精确）
  function emitReadout(options: LayerViewportOptions): void {
    // tree 的视口属性类型为 INumber（number | undefined），刚刚在 applyViewport 中赋过值
    const scale = app.tree.scaleX ?? 1;
    const panX = app.tree.x ?? 0;
    const panY = app.tree.y ?? 0;
    // 标记点的屏幕（世界）坐标由 tree 视口变换线性映射得到
    // （等价于 marker.getBounds('box', 'world')，本层无旋转，公式精确）
    const worldX = panX + MARKER_X * scale;
    const worldY = panY + MARKER_Y * scale;
    emit({
      scale,
      panX,
      panY,
      groundScale: options.layerSync ? scale : 1,
      markerContentX: MARKER_X,
      markerContentY: MARKER_Y,
      markerWorldX: worldX,
      markerWorldY: worldY,
    });
  }

  function applyViewport(options: LayerViewportOptions): void {
    const { scale, panX, panY, layerSync } = options;
    // zoomLayer 即承载视口缩放平移的层：默认等于 app.tree 自身
    app.tree.zoomLayer.set({ scaleX: scale, scaleY: scale, x: panX, y: panY });
    // ground 是独立的 Leafer 层，默认不随 tree 视口变化；
    // layerSync 打开时手动同步同一变换，演示层间坐标映射
    app.ground.zoomLayer.set(
      layerSync
        ? { scaleX: scale, scaleY: scale, x: panX, y: panY }
        : { scaleX: 1, scaleY: 1, x: 0, y: 0 },
    );
    emitReadout(options);
  }

  // 同步画布尺寸：helper 的 <canvas> 用 CSS 撑满舞台，需要在 resize 时调整 App 尺寸
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    app.resize({ width: Math.max(320, width), height: Math.max(240, height) });
  });

  // 初始视口
  applyViewport({ scale: 1, panX: 80, panY: 60, layerSync: false });

  return {
    update(options) {
      applyViewport(options);
    },
    dispose() {
      resizeObserver.disconnect();
      app.destroy();
    },
  };
}
