/**
 * 演示内容：用 leafer-ui 创建 LeaferJS 的基础图形家族——矩形 Rect、圆 / 椭圆 Ellipse、
 *           直线 / 折线 Line、多边形 Polygon、多角星形 Star，并用一个切换器在同一画布中渲染当前选中的图形。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM 并填满舞台）。
 *           本课公开输入为 图形类型 shape、主尺寸 width、高度 height、边数 sides、圆角 cornerRadius、填充色 fill。
 * 主要操作：new Leafer({ view: canvas }) 复用传入的 <canvas> 作为渲染目标；
 *           按 shape 用对应的 UI 类（new Rect / Ellipse / Line / Polygon / Star）创建节点，
 *           通过 around: 'center' 把图形居中到画布中心（around 的完整用法见「变换」课）；
 *           update(options) 切换图形时移除旧节点、挂上新节点并重算读数。
 * 预期结果：切换 shape → 画布上的图形类型变化；调整 width / height / sides / cornerRadius / fill →
 *           图形尺寸、边数、圆角、颜色同步变化；左下角读数显示「图形 / 实际类 / 主尺寸 / 形态」。
 *           其中「实际类」揭示关键映射：圆 = Ellipse(宽=高)、折线 = Line(points)。
 * 阅读主线：createBasicShapes → Leafer 配置(view) → buildShape 按类型构造节点 → 居中挂载 → update 同步 → dispose 销毁。
 */
import {
  Leafer,
  Rect,
  Ellipse,
  Line,
  Polygon,
  Star,
  type IUI,
} from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type BasicShapeType =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'star';

export interface BasicShapeOptions {
  shape: BasicShapeType;
  width: number;
  height: number;
  sides: number;
  cornerRadius: number;
  fill: string;
}

export interface BasicShapeSnapshot {
  /** 读者选择的图形（中文概念名）。 */
  shape: string;
  /** LeaferJS 中真正实例化的 UI 类名（揭示 圆→Ellipse、折线→Line 的映射）。 */
  className: string;
  /** 当前图形的主尺寸，按类型给出含义清晰的描述。 */
  size: string;
  /** 形态备注：圆角值 / 边数 / 角数 / points 模式等类型相关要点。 */
  note: string;
}

export interface BasicShapeInstance {
  update(options: BasicShapeOptions): void;
  dispose(): void;
}

const STROKE = '#1f8b5a';
const STROKE_WIDTH = 4;

// 中文概念名 → 实际 UI 类名。圆与折线没有独立类，分别由 Ellipse、Line 承担。
const SHAPE_LABELS: Record<BasicShapeType, { name: string; className: string }> = {
  rect: { name: '矩形', className: 'Rect' },
  circle: { name: '圆', className: 'Ellipse' },
  ellipse: { name: '椭圆', className: 'Ellipse' },
  line: { name: '直线', className: 'Line' },
  polyline: { name: '折线', className: 'Line' },
  polygon: { name: '多边形', className: 'Polygon' },
  star: { name: '星形', className: 'Star' },
};

export function createBasicShapes(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BasicShapeSnapshot) => void,
): BasicShapeInstance {
  let current: BasicShapeOptions = {
    shape: 'rect',
    width: 180,
    height: 120,
    sides: 5,
    cornerRadius: 0,
    fill: '#32cd79',
  };

  // view 直接传入 HTMLCanvasElement 时，Leafer 复用该 <canvas> 作为渲染目标。
  // 不给 width / height，让 Leafer 按画布元素的客户端尺寸自适应；舞台尺寸变化时用 resize() 同步。
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  let node: IUI | null = null;

  function syncSize() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });
  }

  function buildShape(options: BasicShapeOptions): IUI {
    const { width, height, sides, cornerRadius, fill } = options;
    // 闭合图形的通用样式：填充 + 描边；直线 / 折线另用 stroke 表达。
    const closedStyle = {
      fill,
      stroke: STROKE,
      strokeWidth: STROKE_WIDTH,
    };

    switch (options.shape) {
      case 'rect':
        // 矩形：width × height，cornerRadius 可分别设置四个角（这里统一圆角）。
        return new Rect({
          width,
          height,
          cornerRadius,
          ...closedStyle,
        });
      case 'circle':
        // 圆 = 椭圆的特例：令 X / Y 直径相等。Ellipse 没有 radius，尺寸由 width / height（直径）决定。
        return new Ellipse({
          width,
          height: width,
          ...closedStyle,
        });
      case 'ellipse':
        // 椭圆：width 为 X 轴直径、height 为 Y 轴直径（圆心位于 width/2, height/2）。
        return new Ellipse({
          width,
          height,
          ...closedStyle,
        });
      case 'line':
        // 两点直线：width 即长度（沿 X 轴），用 stroke 描出；rotation 可旋转，这里保持水平。
        return new Line({
          width,
          stroke: STROKE,
          strokeWidth: STROKE_WIDTH,
          strokeCap: 'round' as const,
        });
      case 'polyline': {
        // 折线 = Line 的 points 模式：坐标组 [x,y, x,y ...]。这里用相对坐标按 width/height 缩放，
        // 让控件能调整折线的包围盒；cornerRadius 可平滑拐角。
        const base = [0, 1, 0.25, 0.15, 0.5, 0.7, 0.75, 0.15, 1, 1];
        const points: number[] = [];
        for (let i = 0; i < base.length; i += 2) {
          points.push(base[i] * width, base[i + 1] * height);
        }
        return new Line({
          points,
          cornerRadius,
          stroke: STROKE,
          strokeWidth: STROKE_WIDTH,
          strokeJoin: 'round' as const,
          strokeCap: 'round' as const,
        });
      }
      case 'polygon':
        // 多边形：sides 为边数（≥3），引擎在虚拟圆上每 360/sides 度取点连成；points 模式可画自由多边形。
        return new Polygon({
          width,
          height,
          sides,
          cornerRadius,
          ...closedStyle,
        });
      case 'star':
        // 星形：corners 为角数（≥3），innerRadius 控制凹度（默认 0.382）；与 Polygon 同属「按数量定义的正图形」。
        return new Star({
          width,
          height,
          corners: sides,
          cornerRadius,
          ...closedStyle,
        });
      default:
        return new Rect({ width, height, ...closedStyle });
    }
  }

  function describeSize(options: BasicShapeOptions): string {
    switch (options.shape) {
      case 'circle':
        // 圆只有一个直径：宽被迫等于高。
        return `直径 ${options.width}`;
      case 'line':
        // 两点直线的 width 是长度，height 不参与。
        return `长度 ${options.width}`;
      case 'polyline':
        return `折线盒 ${options.width} × ${options.height}`;
      default:
        return `${options.width} × ${options.height}`;
    }
  }

  function describeNote(options: BasicShapeOptions): string {
    switch (options.shape) {
      case 'rect':
        return options.cornerRadius > 0
          ? `圆角 ${options.cornerRadius}`
          : '直角';
      case 'circle':
        return '宽=高 → 圆';
      case 'ellipse':
        return 'width=直径X，height=直径Y';
      case 'line':
        return 'width=长度';
      case 'polyline':
        return options.cornerRadius > 0
          ? `points 折线，圆角 ${options.cornerRadius}`
          : 'points 折线';
      case 'polygon':
        return `sides=${options.sides}`;
      case 'star':
        return `corners=${options.sides}`;
      default:
        return '';
    }
  }

  function render(options: BasicShapeOptions) {
    if (node) {
      leafer.remove(node);
      node.destroy();
      node = null;
    }

    node = buildShape(options);

    // around: 'center' 把图形的定位原点移到自身包围盒中心，
    // 于是 x/y 直接给画布中心即可居中；该属性的完整语义见「变换」课。
    const center = {
      x: leafer.canvas.width / 2,
      y: leafer.canvas.height / 2,
    };
    node.set({ around: 'center', x: center.x, y: center.y });
    leafer.add(node);

    const labels = SHAPE_LABELS[options.shape];
    emit({
      shape: labels.name,
      className: labels.className,
      size: describeSize(options),
      note: describeNote(options),
    });
  }

  // 舞台尺寸变化（如 Docs 面板开合）时重置画布尺寸并重新居中渲染。
  const resizeObserver = createResizeObserver(canvas, () => {
    syncSize();
    render(current);
  });

  syncSize();
  render(current);

  return {
    update(options) {
      current = options;
      render(options);
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
