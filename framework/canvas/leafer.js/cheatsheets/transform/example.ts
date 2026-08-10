/**
 * 演示内容：UI 节点的变换属性（rotation / scale / skewX）如何以 around 锚点为支点
 *           作用在本地矩阵上，以及 around 同时充当「变换中心」与「定位锚点」。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           本课公开输入：rotation（旋转角度）、scale（统一缩放）、skewX（X 轴斜切）、
 *           around（锚点：top-left / center / bottom-right）。
 * 主要操作：new Leafer({ view: canvas, width, height }) 按舞台尺寸建固定画布；
 *           画一个 Rect 作为被变换主体，固定 x/y，按 args 设 rotation / scaleX=scaleY=scale / skewX / around；
 *           用 getWorldPointByLocal 读「around 锚点」与「左上角」的世界坐标——
 *           around 锚点恒等于声明的 (x,y)，证明 around 把该点钉在 x/y；左上角随 around 变化，证明 around 改变定位。
 *           用 getBounds('box','world') 读世界包围盒（AABB），旋转/缩放后会变大。
 * 预期结果：调整 rotation/scale/skewX → 矩形绕红色锚点旋转/缩放/斜切，锚点与十字标纹丝不动，
 *           左上角读数与世界包围盒随之变化；切换 around → 矩形整体跳到新位置，
 *           使对应角点/中心落到锚点上（左上角读数明显改变）。
 * 阅读主线：createTransformScene → 固定参考层（世界原点 + 锚点十字/圆点）→ 变换主体 Rect（含朝向小方块）
 *           → update 设值 + updateLayout → 读世界坐标/包围盒 → dispose。
 */
import { Leafer, Rect, Line, Text, Ellipse } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type AroundOption = 'top-left' | 'center' | 'bottom-right';

export interface TransformOptions {
  rotation: number;
  scale: number;
  skewX: number;
  around: AroundOption;
}

export interface TransformSnapshot {
  /** around 锚点的世界坐标：理论上恒等于声明的 (POS_X, POS_Y)。 */
  pivotX: number;
  pivotY: number;
  /** Rect 自身左上角（box 局部 (0,0)）的世界坐标：around 改变时随之移动。 */
  topLeftX: number;
  topLeftY: number;
  /** 世界包围盒（AABB）宽高：旋转/缩放后外接框会变大。 */
  worldW: number;
  worldH: number;
  rotation: number;
  scale: number;
  skewX: number;
}

export interface TransformInstance {
  update(options: TransformOptions): void;
  dispose(): void;
}

// 被变换主体固定的声明位置（即 around 锚点会被钉住的世界坐标）与原始尺寸。
const POS_X = 250;
const POS_Y = 160;
const RECT_W = 156;
const RECT_H = 100;

// around 锚点在 Rect 自身 box 坐标系（未缩放的本地系）里的位置。
function aroundLocalPoint(around: AroundOption): { x: number; y: number } {
  switch (around) {
    case 'top-left':
      return { x: 0, y: 0 };
    case 'bottom-right':
      return { x: RECT_W, y: RECT_H };
    case 'center':
    default:
      return { x: RECT_W / 2, y: RECT_H / 2 };
  }
}

export function createTransformScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransformSnapshot) => void,
): TransformInstance {
  // view 传 HTMLCanvasElement，并按舞台尺寸给出 width/height → 固定尺寸画布铺满舞台。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#ffffff',
  });

  // 世界原点标记：画布左上角的 L 形 + 文字，强调「世界 (0,0) 固定在此」，作为坐标参照。
  leafer.add([
    new Line({ points: [0, 0, 22, 0], stroke: '#94a3b8', strokeWidth: 1.5 }),
    new Line({ points: [0, 0, 0, 22], stroke: '#94a3b8', strokeWidth: 1.5 }),
    new Text({
      text: '世界原点 (0, 0)',
      x: 28,
      y: 4,
      fontSize: 12,
      fill: '#94a3b8',
    }),
  ]);

  // 锚点十字标：固定在声明的 (POS_X, POS_Y) 处，表示「around 把这个点钉在此处」。
  const cross = 32;
  leafer.add([
    new Line({
      points: [POS_X - cross, POS_Y, POS_X + cross, POS_Y],
      stroke: '#ef4444',
      strokeWidth: 1.5,
    }),
    new Line({
      points: [POS_X, POS_Y - cross, POS_X, POS_Y + cross],
      stroke: '#ef4444',
      strokeWidth: 1.5,
    }),
    new Text({
      text: '声明位置 = 变换中心',
      x: POS_X + 16,
      y: POS_Y + 14,
      fontSize: 12,
      fill: '#ef4444',
    }),
  ]);

  // 变换主体：Rect。固定 x/y = (POS_X, POS_Y)，around 动态可调；
  // 左上角放一个琥珀色小方块作为朝向标记，让旋转/斜切的方向一眼可辨。
  const rect = new Rect({
    x: POS_X,
    y: POS_Y,
    width: RECT_W,
    height: RECT_H,
    around: 'center',
    fill: 'rgba(79, 124, 255, 0.22)',
    stroke: '#4f7cff',
    strokeWidth: 2,
    cornerRadius: 6,
  });
  rect.add(
    new Rect({
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill: '#f59e0b',
      cornerRadius: 3,
    }),
  );
  leafer.add(rect);

  // 锚点圆点：最上层，固定钉在 (POS_X, POS_Y)，与 around 锚点重合，是「变换中心」的可视化。
  leafer.add(
    new Ellipse({
      x: POS_X,
      y: POS_Y,
      width: 14,
      height: 14,
      around: 'center',
      fill: '#ef4444',
      stroke: '#ffffff',
      strokeWidth: 2,
    }),
  );

  let current: TransformOptions = {
    rotation: 30,
    scale: 1,
    skewX: 0,
    around: 'center',
  };

  function applyToRect(options: TransformOptions) {
    rect.rotation = options.rotation;
    rect.scaleX = options.scale;
    rect.scaleY = options.scale;
    rect.skewX = options.skewX;
    rect.around = options.around;
  }

  function syncReadout() {
    // 设值后世界矩阵不会立即重算，updateLayout() 触发同步布局，保证换算读到最新坐标。
    leafer.updateLayout();
    const pivotLocal = aroundLocalPoint(current.around);
    // around 锚点的世界坐标：理论上恒等于声明的 (POS_X, POS_Y)，证明 around 把该点钉在 x/y。
    const pivot = rect.getWorldPointByLocal(pivotLocal);
    // Rect 自身左上角（box 局部 (0,0)）的世界坐标：around 改变时它随之移动。
    const topLeft = rect.getWorldPointByLocal({ x: 0, y: 0 });
    // 世界包围盒（AABB）：旋转/缩放后外接框会变大（见包围盒课）。
    const worldBox = rect.getBounds('box', 'world');
    emit({
      pivotX: Math.round(pivot.x),
      pivotY: Math.round(pivot.y),
      topLeftX: Math.round(topLeft.x),
      topLeftY: Math.round(topLeft.y),
      worldW: Math.round(worldBox.width),
      worldH: Math.round(worldBox.height),
      rotation: current.rotation,
      scale: Number(current.scale.toFixed(2)),
      skewX: current.skewX,
    });
  }

  applyToRect(current);
  syncReadout();
  // 首轮渲染、世界矩阵就绪后再派发一次兜底。
  leafer.nextRender(syncReadout);

  // 舞台尺寸变化（如 Storybook 面板开合）时同步画布尺寸并刷新读数。
  const resizeObserver = createResizeObserver(canvas, () => {
    const { width, height } = readCanvasSize(canvas);
    leafer.resize({ width, height });
    syncReadout();
  });

  return {
    update(options) {
      current = options;
      applyToRect(options);
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
