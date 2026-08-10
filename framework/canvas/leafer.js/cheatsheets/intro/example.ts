/**
 * 演示内容：用最小的 Leafer 渲染一个 UI 节点，切换图形与填充色，
 *           让读者看到「声明一个节点 → 引擎把它画出来」，且属性赋值会自动触发重绘。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM）。
 *           本课公开输入为 填充色 fill、图形 shape（矩形/圆/三角形）、圆角 cornerRadius（仅矩形）。
 * 主要操作：new Leafer({ view: canvas, fill }) 接管传入的 <canvas>（view 可直接收 HTMLCanvasElement）；
 *           按 shape 用 new Rect / new Ellipse / new Polygon 声明节点并 leafer.add() 挂载；
 *           属性变化时直接给节点赋值（node.fill = …），引擎的数据代理侦测变化并自动重绘。
 * 预期结果：调节 Controls → 画面即时变化，readout 同步「节点类型 / 填充色 / 子节点数」。
 *           不写一行业余的 requestAnimationFrame 重绘代码，体现声明式节点模型。
 * 阅读主线：createIntro 建立 Leafer 与首个节点 → update 演示「赋值即重绘」与节点替换 → dispose 释放。
 */
import {
  Leafer,
  Rect,
  Ellipse,
  Polygon,
  ResizeEvent,
} from 'leafer-ui';
import { readCanvasSize } from '../../assets/canvas-runtime.js';

/** 本课公开的三种图形，分别对应一个 Leafer UI 节点类型。 */
export type IntroShape = 'rect' | 'circle' | 'triangle';

export interface IntroOptions {
  /** 节点填充色。 */
  fill: string;
  /** 节点图形，决定创建哪种 UI 节点。 */
  shape: IntroShape;
  /** 矩形圆角（仅对 Rect 生效）。 */
  cornerRadius: number;
}

export interface IntroSnapshot {
  /** 当前节点的 __tag（Rect / Ellipse / Polygon）。 */
  tag: string;
  /** 当前填充色。 */
  fill: string;
  /** Leafer 根节点下的直接子节点数量。 */
  nodeCount: number;
}

export interface IntroInstance {
  update(options: IntroOptions): void;
  dispose(): void;
}

const SHAPE_SIZE = 170;

/** 节点的 around 设为 center，配合 x/y = 画布中心即可让图形居中。 */
function createNode(options: IntroOptions): Rect | Ellipse | Polygon {
  switch (options.shape) {
    case 'circle':
      return new Ellipse({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        fill: options.fill,
        around: 'center',
      });
    case 'triangle':
      // Polygon 的 sides 默认就是 3；显式写出便于读者一眼看出「这是一个三角形节点」。
      return new Polygon({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        sides: 3,
        fill: options.fill,
        around: 'center',
      });
    case 'rect':
    default:
      return new Rect({
        width: SHAPE_SIZE,
        height: SHAPE_SIZE,
        cornerRadius: options.cornerRadius,
        fill: options.fill,
        around: 'center',
      });
  }
}

export function createIntro(
  canvas: HTMLCanvasElement,
  emit: (snapshot: IntroSnapshot) => void,
): IntroInstance {
  // view 直接接收一个已存在的 <canvas>，Leafer 会复用它作为渲染目标；
  // 不传 width/height → 进入自动布局，按父容器（.cs-stage）尺寸自适应。
  const leafer = new Leafer({ view: canvas, fill: '#f8fafc' });

  let current: IntroOptions = {
    fill: '#4f7cff',
    shape: 'rect',
    cornerRadius: 18,
  };
  let node: Rect | Ellipse | Polygon = createNode(current);
  leafer.add(node);

  function centerNode() {
    // leafer.canvas.width / height 为画布逻辑尺寸（与 pixelRatio 解耦）。
    const { width, height } = leafer.canvas;
    node.x = (width || readCanvasSize(canvas).width) / 2;
    node.y = (height || readCanvasSize(canvas).height) / 2;
  }

  function emitSnapshot() {
    emit({
      tag: node.__tag,
      fill: current.fill,
      nodeCount: leafer.children.length,
    });
  }

  centerNode();

  // 自动布局引起画布尺寸变化时，重新把节点挪到画布中心。
  // 这也顺带展示 Leafer 自带的事件能力：on(event, listener)。
  const onResize = () => {
    centerNode();
    emitSnapshot();
  };
  leafer.on(ResizeEvent.RESIZE, onResize);

  // 首帧兜底：自动布局完成宽高的时机可能略晚于构造，下一帧再对齐一次并派发读数。
  requestAnimationFrame(() => {
    centerNode();
    emitSnapshot();
  });

  return {
    update(options: IntroOptions) {
      const shapeChanged = options.shape !== current.shape;
      current = options;

      if (shapeChanged) {
        // 切换图形 = 换一个 UI 节点：移除旧节点并销毁，新建对应类型的节点挂回根。
        leafer.remove(node, true);
        node = createNode(options);
        leafer.add(node);
        centerNode();
      } else {
        // 同一节点上直接赋值：引擎侦测到属性变化后自动重绘，无需手动调用渲染。
        node.fill = options.fill;
        if (node instanceof Rect) node.cornerRadius = options.cornerRadius;
      }

      emitSnapshot();
    },
    dispose() {
      leafer.off(ResizeEvent.RESIZE, onResize);
      leafer.destroy();
    },
  };
}
