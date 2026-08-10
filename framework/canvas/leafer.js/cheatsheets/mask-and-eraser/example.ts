/**
 * 演示内容：mask（遮罩）、clip（裁剪）、eraser（擦除）三种限定可见区域手段的差异，
 *           以及 mask 在 path / pixel / grayscale / clipping / clipping-path 五种 maskType 下的表现。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入为 模式 mode（none / mask / eraser / clip）与 遮罩类型 maskType（仅 mask 模式生效）。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas>；
 *           底图 = 一块铺满画布的线性渐变 Rect + 一组定位标记点（中心 / 轴向内侧 / 对角外侧 / 远端）。
 *           限定形状 = 一个径向渐变 Ellipse（不透明中心 → 透明边缘，用来区分 path 与 pixel）。
 *           rebuild() 按 mode 重组节点树：
 *             none   → 直接把底图加到 leafer；
 *             mask   → Group 内先加 limiter（设 mask），再加底图；mask 影响同组「上层」兄弟；
 *             eraser → Group 内先加底图，再加 limiter（设 eraser）；eraser 擦除同组「下层」兄弟；
 *             clip   → Box({ overflow:'hide' }) 作为底图的父容器，按容器宽高矩形裁剪「自身子级」。
 *           切 maskType 时（仅 mask 模式）把 limiter.mask 改为对应类型后整体重建。
 * 预期结果：none 看到完整底图；mask 只剩圆形内侧底图；eraser 底图被挖出一个圆形洞；
 *           clip 底图被裁成矩形（对角标记在 clip 内可见、在 mask 内不可见，正可区分二者）；
 *           mask 下切 maskType：path 硬边、pixel 软边、grayscale 按明度、clipping/clipping-path 渲染遮罩自身。
 *           左下角读数读出 当前模式 / 限定类型 / 影响对象 / 限定形状。
 * 阅读主线：createMaskEraser → Leafer 配置(view) → buildBase/buildLimiter → rebuild 按 mode 组装 → dispose 销毁。
 */
import { Leafer, Group, Box, Rect, Ellipse } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LimitMode = 'none' | 'mask' | 'eraser' | 'clip';
export type MaskTypeOption =
  | 'path'
  | 'pixel'
  | 'grayscale'
  | 'clipping'
  | 'clipping-path';

export interface MaskEraserOptions {
  mode: LimitMode;
  maskType: MaskTypeOption;
}

export interface MaskEraserSnapshot {
  /** 当前模式（中文概念名）。 */
  mode: string;
  /** 限定类型：mask 的 maskType / eraser 的默认 pixel / clip 的 overflow。 */
  limitType: string;
  /** 限定作用对象：同组上层兄弟 / 同组下层兄弟 / 容器自身子级。 */
  affect: string;
  /** 限定形状：圆形（任意形状）/ 矩形（容器宽高）。 */
  shape: string;
}

export interface MaskEraserInstance {
  update(options: MaskEraserOptions): void;
  dispose(): void;
}

const MODE_LABELS: Record<LimitMode, string> = {
  none: '无',
  mask: 'mask 遮罩',
  eraser: 'eraser 擦除',
  clip: 'clip 裁剪',
};

// 底图：铺满画布的彩色线性渐变 + 一组定位标记点。
// 标记点分布在三个半径上，用来在三种模式下呈现可区分的证据：
//   中心点（0）—— 三种模式都在限定区中心；
//   轴向内侧（0.6r）—— 在圆 r 内、也在矩形（半边 r）内；
//   对角外侧（1.18r）—— 在圆 r 外、但在矩形角（约 1.41r）内 → 区分 mask（圆）与 clip（方）；
//   远端（1.35r 轴向）—— 在圆与矩形之外 → 仅 none / eraser 存活。
function buildBase(W: number, H: number, cx: number, cy: number, r: number): Group {
  const base = new Group();

  base.add(
    new Rect({
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: {
        type: 'linear',
        from: 'top-left',
        to: 'bottom-right',
        stops: ['#4f7cff', '#9b5cff', '#ff5b8a'],
      },
    }),
  );

  const dotR = Math.max(5, r * 0.12);
  const ring = (
    radius: number,
    color: string,
    angles: number[],
  ) => {
    for (const a of angles) {
      const px = cx + radius * Math.cos(a);
      const py = cy + radius * Math.sin(a);
      base.add(
        new Ellipse({
          x: px - dotR,
          y: py - dotR,
          width: dotR * 2,
          height: dotR * 2,
          fill: color,
        }),
      );
    }
  };

  // 中心点
  base.add(
    new Ellipse({
      x: cx - dotR,
      y: cy - dotR,
      width: dotR * 2,
      height: dotR * 2,
      fill: '#ffffff',
    }),
  );
  // 轴向内侧（0/90/180/270°，半径 0.6r）
  ring(r * 0.6, '#ffe066', [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]);
  // 对角外侧（45/135/225/315°，半径 1.18r）
  ring(
    r * 1.18,
    '#7CFFB2',
    [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4],
  );
  // 远端（0/180°，半径 1.35r）—— 超出限定区，作为 none 的参照
  ring(r * 1.35, '#FF8B3D', [0, Math.PI]);

  return base;
}

// 限定形状：径向渐变圆（不透明中心 → 恰好在半径 r 处透明）。
// to:'right' 让渐变半径 = 圆半径 r，保证 pixel 类型下限定区域也收拢在 r 内，
// 从而三种 maskType 都在同一半径裁剪；渐变本身让 path（硬边）与 pixel（软边）呈现差异。
function buildLimiter(cx: number, cy: number, r: number): Ellipse {
  return new Ellipse({
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 2,
    fill: {
      type: 'radial',
      from: 'center',
      to: 'right',
      stops: [
        { offset: 0, color: '#ffd54a' },
        { offset: 0.65, color: '#ff6b6b' },
        { offset: 1, color: 'rgba(255,107,107,0)' },
      ],
    },
  });
}

function describe(mode: LimitMode, maskType: MaskTypeOption): MaskEraserSnapshot {
  let limitType: string;
  let affect: string;
  let shape: string;

  if (mode === 'mask') {
    limitType = maskType;
    affect = '同 Group 内上层兄弟';
    shape = '圆形（限定形状）';
  } else if (mode === 'eraser') {
    limitType = 'pixel（默认）';
    affect = '同 Group 内下层兄弟';
    shape = '圆形（限定形状）';
  } else if (mode === 'clip') {
    limitType = "overflow = 'hide'";
    affect = '容器自身的子级';
    shape = '矩形（容器宽高）';
  } else {
    limitType = '—';
    affect = '—';
    shape = '—';
  }

  return { mode: MODE_LABELS[mode], limitType, affect, shape };
}

export function createMaskEraser(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MaskEraserSnapshot) => void,
): MaskEraserInstance {
  let current: MaskEraserOptions = { mode: 'mask', maskType: 'pixel' };

  // view 直接传入 HTMLCanvasElement 时，Leafer 复用该 <canvas> 作为渲染目标。
  // 不给固定 width/height，舞台尺寸变化时用 resize() 同步。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  // 当前挂在 leafer 下的顶层容器：none=底图 Group、mask/eraser=外层 Group、clip=Box。
  let container: Group | Box | null = null;

  function rebuild() {
    // 上一轮的节点整棵销毁后重建：mask/eraser/clip 结构互不兼容，且需重置限定属性。
    if (container) {
      leafer.remove(container, true);
      container = null;
    }

    const size = readCanvasSize(canvas);
    const W = size.width;
    const H = size.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.26;

    const base = buildBase(W, H, cx, cy, r);
    const limiter = buildLimiter(cx, cy, r);
    const { mode, maskType } = current;

    if (mode === 'none') {
      leafer.add(base);
      container = base;
    } else if (mode === 'mask') {
      // mask 节点放在底层，影响同 Group 内位于其「上层」的兄弟（底图）。
      const group = new Group();
      limiter.mask = maskType;
      group.add(limiter);
      group.add(base);
      leafer.add(group);
      container = group;
    } else if (mode === 'eraser') {
      // eraser 节点放在顶层，擦除同 Group 内位于其「下层」的兄弟（底图）。
      const group = new Group();
      group.add(base);
      limiter.eraser = 'pixel';
      group.add(limiter);
      leafer.add(group);
      container = group;
    } else {
      // clip：把底图作为 Box 子级，Box 用 overflow:'hide' 按自身宽高裁剪子内容。
      // 底图按画布绝对坐标构建，这里把它的本地原点偏移到 Box 左上角的反方向，
      // 使底图在 Box 内仍出现在原画布位置（只露出 Box 矩形范围内的部分）。
      const bx = cx - r;
      const by = cy - r;
      const box = new Box({
        x: bx,
        y: by,
        width: r * 2,
        height: r * 2,
        overflow: 'hide',
      });
      base.x = -bx;
      base.y = -by;
      box.add(base);
      leafer.add(box);
      container = box;
    }

    emit(describe(mode, maskType));
  }

  const resizeObserver = createResizeObserver(canvas, rebuild);

  rebuild();

  return {
    update(options) {
      current = options;
      rebuild();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
