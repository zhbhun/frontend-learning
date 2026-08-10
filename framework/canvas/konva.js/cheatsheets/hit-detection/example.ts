/**
 * 范例介绍：演示 Konva 命中检测的核心机制——命中画布（hit canvas）+ 颜色键。
 * 可见图形未必等于可点击区域：每个 Layer 在可见画布之外维护一张命中画布，按
 * 「每个形状一个唯一颜色键」绘制；指针事件触发时，Konva 读取命中画布上指针
 * 位置的像素颜色，经颜色键 → 形状反查表得到命中目标。
 *
 * 核心观察（Controls 驱动）：
 *   1. 切换「命中区域」(hitMode)：命中画布上星形的区域随之改变，但可见星形不变。
 *      - star：命中 = 可见星形（默认，hitFunc 复刻 sceneFunc 路径）。
 *      - circle：命中 = 半径 96 的大圆，指针落在星臂空隙仍命中星形。
 *      - compact：命中 = 半径 22 的小圆，指针落在星尖反而命中背景。
 *   2. 关闭「可命中」(listening=false)：星形从命中画布移除，指针穿透到背景。
 *   3. 开启「显示命中区域」(showHitRegion)：半透明青色覆盖层标出当前命中范围，
 *      可直接对比「可见图形」与「可点击区域」的差异。
 *
 * 输入（Controls）：hitMode / listening / showHitRegion。
 * 操作（在 Canvas 上移动指针）：读数「命中目标」实时反映 stage.getIntersection
 *   的返回值——即命中画布的检测结果。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type HitMode = 'star' | 'circle' | 'compact';

export interface HitDetectionOptions {
  /** hitMode：星形命中区域的形状。star=沿用可见星形、circle=大圆、compact=小圆。 */
  hitMode: HitMode;
  /** listening：星形是否参与命中检测。false 时从命中画布移除，指针穿透。 */
  listening: boolean;
  /** showHitRegion：是否叠加半透明覆盖层标出命中区域。 */
  showHitRegion: boolean;
}

export interface HitDetectionSnapshot {
  /** 指针当前命中目标的友好名称。 */
  hitTarget: string;
  /** 当前命中区域模式标签。 */
  hitRegion: string;
  /** 星形 listening 状态。 */
  starListening: boolean;
}

export interface HitDetectionInstance {
  update(options: HitDetectionOptions): void;
  dispose(): void;
}

// 命中区域半径：circle 大于外径（更易命中），compact 小于内径（更难命中）。
const HIT_RADIUS_CIRCLE = 96;
const HIT_RADIUS_COMPACT = 22;

// 星形几何参数。
const STAR_INNER = 38;
const STAR_OUTER = 78;
const STAR_POINTS = 5;

const HIT_MODE_LABEL: Record<HitMode, string> = {
  star: `星形（默认）`,
  circle: `大圆 r=${HIT_RADIUS_CIRCLE}`,
  compact: `小圆 r=${HIT_RADIUS_COMPACT}`,
};

/**
 * 复刻 Konva.Star 的 sceneFunc 路径，让 'star' 模式的命中区域与可见星形完全重合。
 * 公式取自 Konva 10.3 的 Star._sceneFunc：首点在正上方，奇偶交替内外径。
 */
function drawStarPath(
  context: Konva.Context,
  inner: number,
  outer: number,
  points = STAR_POINTS,
) {
  context.beginPath();
  context.moveTo(0, -outer);
  for (let n = 1; n < points * 2; n++) {
    const radius = n % 2 === 0 ? outer : inner;
    const x = radius * Math.sin((n * Math.PI) / points);
    const y = -radius * Math.cos((n * Math.PI) / points);
    context.lineTo(x, y);
  }
  context.closePath();
}

export function createHitDetection(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HitDetectionSnapshot) => void,
): HitDetectionInstance {
  const root = canvas.parentElement;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container，因此用一个独立包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，
  // 改由 Konva 的图层画布承载绘制。
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
  const layer = new Konva.Layer();
  stage.add(layer);

  // 背景：命中的「兜底」目标，铺满舞台。星形不可命中或命中区域较小时，
  // getIntersection 会返回它——读数显示「背景」即「未命中星形」。
  const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: initial.width,
    height: initial.height,
    fill: '#f1f5f9',
    name: '背景',
  });
  layer.add(background);

  // 演示主角：五角星。其 hitFunc 随 hitMode 改变，决定命中画布上的区域形状。
  // 坐标原点在星形中心，hitFunc 内的路径都围绕 (0,0) 绘制。
  const star = new Konva.Star({
    x: initial.width / 2,
    y: initial.height / 2,
    numPoints: STAR_POINTS,
    innerRadius: STAR_INNER,
    outerRadius: STAR_OUTER,
    fill: '#4f7cff',
    stroke: '#1e293b',
    strokeWidth: 2,
    name: '星形',
  });
  layer.add(star);

  // 命中区域覆盖层：半透明青色，标出星形当前命中范围。listening:false 确保它
  // 本身不进入命中画布、不影响检测结果。读取 current.hitMode 实时切换形状。
  const hitOverlay = new Konva.Shape({
    x: star.x(),
    y: star.y(),
    sceneFunc(context, shape) {
      if (current.hitMode === 'star') {
        drawStarPath(
          context,
          star.innerRadius(),
          star.outerRadius(),
          star.numPoints(),
        );
      } else {
        const r =
          current.hitMode === 'circle'
            ? HIT_RADIUS_CIRCLE
            : HIT_RADIUS_COMPACT;
        context.beginPath();
        context.arc(0, 0, r, 0, Math.PI * 2);
        context.closePath();
      }
      context.fillStrokeShape(shape);
    },
    fill: 'rgba(34, 211, 238, 0.25)',
    stroke: '#0891b2',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false,
    visible: false,
  });
  layer.add(hitOverlay);

  // 命中标记：跟随指针的圆点 + 目标名称标签，让 getIntersection 的结果可视。
  const marker = new Konva.Circle({
    radius: 5,
    fill: 'rgba(239, 68, 68, 0.9)',
    stroke: 'white',
    strokeWidth: 2,
    listening: false,
    visible: false,
  });
  layer.add(marker);

  const targetLabel = new Konva.Text({
    text: '',
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fill: '#ef4444',
    listening: false,
    visible: false,
  });
  layer.add(targetLabel);

  // 顶部提示文字。
  const hint = new Konva.Text({
    text: '在画布上移动指针 →  读数「命中目标」= stage.getIntersection 结果',
    x: 16,
    y: 14,
    fontSize: 13,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fill: '#475569',
    listening: false,
  });
  layer.add(hint);

  let current: HitDetectionOptions = {
    hitMode: 'star',
    listening: true,
    showHitRegion: false,
  };

  // 星形 hitFunc：始终读取 current.hitMode，随控件切换。star 模式复刻可见星形
  // 路径；circle / compact 模式改为圆形。末尾 fillStrokeShape 把路径按颜色键
  // 绘制到命中画布。用箭头函数捕获外层 star 实例，避免 this 绑定歧义。
  star.hitFunc((context) => {
    if (current.hitMode === 'star') {
      drawStarPath(
        context,
        star.innerRadius(),
        star.outerRadius(),
        star.numPoints(),
      );
    } else {
      const r =
        current.hitMode === 'circle' ? HIT_RADIUS_CIRCLE : HIT_RADIUS_COMPACT;
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.closePath();
    }
    context.fillStrokeShape(star);
  });

  function emitSnapshot(hitTarget: string) {
    emit({
      hitTarget,
      hitRegion: HIT_MODE_LABEL[current.hitMode],
      starListening: current.listening,
    });
  }

  function moveMarkerTo(pos: Konva.Vector2d, name: string) {
    marker.position(pos);
    marker.visible(true);
    targetLabel.text(`命中: ${name}`);
    targetLabel.position({ x: pos.x + 12, y: pos.y - 20 });
    targetLabel.visible(true);
  }

  function hideMarker() {
    marker.visible(false);
    targetLabel.visible(false);
  }

  // 指针移动时显式调用 stage.getIntersection 查询命中画布——与事件系统内部
  // 用的同一套机制。listening:false 的形状会被跳过，返回 null 时落为「空白」。
  stage.on('mousemove touchmove', () => {
    const pos = stage.getPointerPosition();
    if (!pos) {
      return;
    }
    const hit = stage.getIntersection(pos);
    const name = hit ? hit.name() || hit.getClassName() : '空白';
    moveMarkerTo(pos, name);
    layer.batchDraw();
    emitSnapshot(name);
  });

  stage.on('mouseleave', () => {
    hideMarker();
    layer.batchDraw();
    emitSnapshot('—');
  });

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    background.width(width);
    background.height(height);

    const cx = width / 2;
    const cy = height / 2;
    star.position({ x: cx, y: cy });
    hitOverlay.position({ x: cx, y: cy });

    layer.batchDraw();
    emitSnapshot('—');
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      // listening:false 把星形移出命中画布；getIntersection 与事件都不再命中它。
      star.listening(options.listening);
      hitOverlay.visible(options.showHitRegion);
      layer.batchDraw();
      emitSnapshot('—');
    },
    dispose() {
      resizeObserver.disconnect();
      stage.destroy();
      wrapper.remove();
    },
  };
}
