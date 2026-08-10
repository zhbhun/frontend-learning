/**
 * 演示内容：用 leafer-ui 创建第一个场景——安装导入、new Leafer() 配置画布、挂载到已有 <canvas>，
 *           再用 leafer.add() 把一个 Rect 节点挂上并渲染。
 * 输入/前置：canvasStory 传入一个 helper 新建的 <canvas>（已插入 DOM）。
 *           本课公开输入为 画布宽度 width、画布高度 height、画布背景色 fill。
 * 主要操作：new Leafer({ view: canvas, width, height, fill }) 创建固定尺寸画布；
 *           new Rect({...}) + leafer.add(rect) 挂载第一个节点；
 *           用内联 style 让画布按逻辑尺寸居中显示，覆盖外壳 CSS 的 100% 拉伸，使宽高变化在页面上可见。
 * 预期结果：拖动宽高 → 画布 visibly 缩放、读数同步；改 fill → 画布背景色变化；
 *           读出「实际渲染尺寸」(leafer.canvas.width/height) 与「节点数量」(leafer.children.length)。
 * 阅读主线：createFirstScene → Leafer 配置(view/width/height/fill) → rect 挂载 → update 同步 → dispose 销毁。
 */
import { Leafer, Rect } from 'leafer-ui';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

export interface FirstSceneOptions {
  width: number;
  height: number;
  fill: string;
}

export interface FirstSceneSnapshot {
  /** 画布逻辑宽度（Leafer 实际渲染尺寸，单位为逻辑像素）。 */
  width: number;
  /** 画布逻辑高度。 */
  height: number;
  /** 当前画布背景色。 */
  fill: string;
  /** Leafer 根节点下的直接子节点数量。 */
  nodeCount: number;
}

export interface FirstSceneInstance {
  update(options: FirstSceneOptions): void;
  dispose(): void;
}

const RECT_FILL = '#32cd79';

export function createFirstScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FirstSceneSnapshot) => void,
): FirstSceneInstance {
  let current: FirstSceneOptions = { width: 480, height: 320, fill: '#ffffff' };

  // 固定尺寸模式下，Leafer 按 pixelRatio 设置画布的像素缓冲（canvas.width/height），
  // 这里只控制 CSS 显示尺寸并把画布在舞台中居中，覆盖外壳 .cs-stage canvas { width:100%; height:100% }
  // 的拉伸，使「调整画布宽高」在页面上肉眼可见。
  canvas.style.position = 'absolute';
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
  canvas.style.borderRadius = '4px';
  canvas.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.12)';

  // view 直接传入 HTMLCanvasElement 时，Leafer 会复用该 <canvas> 作为渲染目标（不会另建画布）。
  // width/height 同时给出 → 固定尺寸画布；fill → 画布背景色（写入 canvas 的 CSS background-color）。
  const leafer = new Leafer({
    view: canvas,
    width: current.width,
    height: current.height,
    fill: current.fill,
  });

  // 第一个图形节点：Rect。leafer.add() 把它挂到 Leafer 根节点上，引擎随即渲染。
  // draggable 展示 Leafer 开箱即用的交互能力：直接用鼠标拖动矩形。
  const rect = new Rect({
    x: 32,
    y: 32,
    width: 120,
    height: 120,
    fill: RECT_FILL,
    cornerRadius: 12,
    draggable: true,
  });
  leafer.add(rect);

  applyDisplaySize(current.width, current.height);

  function applyDisplaySize(width: number, height: number) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  function syncReadout() {
    // leafer.canvas.width / height 为逻辑尺寸（与 pixelRatio 解耦），即实际渲染尺寸。
    // leafer.children 为根节点的直接子节点列表，证明 add 生效。
    emit({
      width: leafer.canvas.width,
      height: leafer.canvas.height,
      fill: current.fill,
      nodeCount: leafer.children.length,
    });
  }

  // 观察舞台尺寸变化（如 Storybook 面板开合），变化时刷新一次读数兜底显示。
  const resizeObserver = createResizeObserver(canvas, syncReadout);

  // 首次派发读数。
  syncReadout();

  return {
    update(options) {
      current = options;
      // Leafer 的运行期 API：resize() 改画布尺寸（内部按 pixelRatio 重置缓冲），
      // 给 fill 赋值触发背景色更新。二者都会引发重绘。
      leafer.resize({ width: options.width, height: options.height });
      leafer.fill = options.fill;
      applyDisplaySize(options.width, options.height);
      syncReadout();
    },
    dispose() {
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
