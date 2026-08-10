/**
 * 包围盒范例。
 *
 * 演示内容：一个带描边、可旋转的矩形，叠加两条世界坐标 AABB 外框——
 * 蓝色虚线 = worldBoxBounds（基准边界的世界 AABB），橙色实线 = worldRenderBounds（渲染边界的世界 AABB）。
 * 左下角读数同步给出 boxBounds（内边界，inner OBB）、worldBoxBounds、worldRenderBounds 的尺寸。
 *
 * 输入 / 前置：canvasStory 注入的 <canvas>；Leafer 以 view 传入该 canvas 作为渲染画布。
 *
 * 主要操作：
 * - rotation：旋转角度（0–90°）。旋转不改变 boxBounds，但会让两个世界 AABB 外框变大（轴对齐外接）。
 * - strokeWidth：描边宽度（0–40）。只扩大 worldRenderBounds，使其超出 worldBoxBounds；为 0 时两者重合。
 * - strokeAlign：描边对齐（center / inside / outside）。决定描边外扩幅度，进而影响 renderBounds。
 *
 * 预期结果：旋转增大时 boxBounds 读数恒定，两个世界 AABB 读数增大；
 * 描边增大时仅 worldRenderBounds 增大；描边为 0 时两条外框完全重合。
 *
 * 阅读主线：建场景（pivot 居中、target 偏移到原点）→ sync 应用输入 → 读 target 的
 *           boxBounds / worldBoxBounds / worldRenderBounds → 用读数定位两条外框并 emit 读数。
 */
import { Leafer, Group, Rect, Text } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface BoundsOptions {
  rotation: number;
  strokeWidth: number;
  strokeAlign: 'center' | 'inside' | 'outside';
}

export interface BoundsSnapshot {
  innerBox: string; // boxBounds（inner OBB）：恒等于自身宽高区域
  worldBox: string; // worldBoxBounds：基准边界的世界 AABB
  worldRender: string; // worldRenderBounds：渲染边界的世界 AABB
  rotation: number;
  strokeWidth: number;
  strokeAlign: string;
}

export interface BoundsInstance {
  update(options: BoundsOptions): void;
  dispose(): void;
}

// 目标矩形固定尺寸（非正方形，旋转后 AABB 增大效果更明显）。
const TARGET_W = 200;
const TARGET_H = 120;

export function createBounds(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BoundsSnapshot) => void,
): BoundsInstance {
  const leafer = new Leafer({ view: canvas, fill: '#ffffff' });

  // pivot 居中并承担旋转：它的本地原点 (0,0) 即画布中心。
  // target 以 (-W/2,-H/2) 偏移后正好压在原点上，于是旋转 pivot 等价于绕 target 中心旋转，
  // 避免绕左上角旋转导致矩形甩出画布——这里只关心包围盒，不演示锚点机制。
  const pivot = new Group();
  const target = new Rect({
    x: -TARGET_W / 2,
    y: -TARGET_H / 2,
    width: TARGET_W,
    height: TARGET_H,
    fill: '#6366f1',
    stroke: '#1e293b',
    strokeWidth: 12,
    strokeAlign: 'center',
    cornerRadius: 8,
  });
  pivot.add(target);

  // 两条世界 AABB 外框直接挂在根上（不随 pivot 旋转），保持轴对齐；
  // 每帧用 target 的世界包围盒读数重新定位，让外框始终精确包住旋转后的矩形。
  const boxOverlay = new Rect({
    stroke: '#0ea5e9',
    strokeWidth: 1.5,
    dashPattern: [6, 4],
  });
  const renderOverlay = new Rect({
    stroke: '#f59e0b',
    strokeWidth: 1.5,
  });
  const centerDot = new Rect({ width: 6, height: 6, fill: '#ef4444' });
  const legend = new Text({
    text: 'worldBoxBounds（蓝·虚线）   worldRenderBounds（橙·实线）',
    fill: '#475569',
    fontSize: 12,
  });

  leafer.add(pivot);
  leafer.add(boxOverlay);
  leafer.add(renderOverlay);
  leafer.add(centerDot);
  leafer.add(legend);

  let current: BoundsOptions = {
    rotation: 25,
    strokeWidth: 12,
    strokeAlign: 'center',
  };

  // 与画布尺寸相关的静态定位：旋转中心放在画布中心，图例固定在左上角。
  function placeStatic() {
    const { width: W, height: H } = readCanvasSize(canvas);
    const cx = W / 2;
    const cy = H / 2;
    pivot.set({ x: cx, y: cy });
    centerDot.set({ x: cx - 3, y: cy - 3 });
    legend.set({ x: 14, y: 12 });
  }

  function sync() {
    pivot.rotation = current.rotation;
    target.strokeWidth = current.strokeWidth;
    target.strokeAlign = current.strokeAlign;

    // boxBounds / worldBoxBounds / worldRenderBounds 都会先触发布局刷新再返回值，
    // 所以读到的尺寸已反映本次 rotation 与 strokeWidth 的修改。
    // - boxBounds：内边界 OBB，恒为自身宽高区域，旋转 / 平移都不变。
    // - worldBoxBounds：基准边界的世界 AABB，旋转后变大（轴对齐外接）。
    // - worldRenderBounds：渲染边界的世界 AABB，在 worldBoxBounds 基础上再叠加描边外扩。
    const inner = target.boxBounds;
    const worldBox = target.worldBoxBounds;
    const worldRender = target.worldRenderBounds;

    boxOverlay.set({
      x: worldBox.x,
      y: worldBox.y,
      width: worldBox.width,
      height: worldBox.height,
    });
    renderOverlay.set({
      x: worldRender.x,
      y: worldRender.y,
      width: worldRender.width,
      height: worldRender.height,
    });

    emit({
      innerBox: `${Math.round(inner.width)} × ${Math.round(inner.height)}`,
      worldBox: `${Math.round(worldBox.width)} × ${Math.round(worldBox.height)}`,
      worldRender: `${Math.round(worldRender.width)} × ${Math.round(worldRender.height)}`,
      rotation: current.rotation,
      strokeWidth: current.strokeWidth,
      strokeAlign: current.strokeAlign,
    });
  }

  function refresh() {
    placeStatic();
    sync();
  }

  const resizeObserver = createResizeObserver(canvas, refresh);

  // 首帧布局可能尚未完成，渲染一轮后再同步一次，保证外框与读数落到最终位置。
  leafer.nextRender(() => refresh());

  return {
    update(options) {
      current = options;
      refresh();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
