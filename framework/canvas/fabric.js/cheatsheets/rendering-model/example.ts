/**
 * 范例介绍：用一个可交互画布核对 Fabric 渲染模型的三个机制——
 * 1. 程序修改对象属性不会自动重绘，requestRenderAll() 才把整帧重绘排队到下一动画帧；
 * 2. set() 修改 fill 会标记缓存失效（dirty），直接赋值不会，重绘后位图仍是旧颜色；
 * 3. enableRetinaScaling 决定画布物理像素是否按 devicePixelRatio 放大。
 * 输入：填充色、改属性方式、改后刷新、retina 缩放开关；画布上可直接点选、拖动矩形或在空白处框选。
 * 预期结果：读数（对象 fill / 缓存待重绘 / 下层重绘次数 / 画布像素 / retina 缩放）与画面变化逐项对应。
 * 阅读主线：update() 的三个分支分别演示“改值、改倍率、请求重绘”，其余状态由 after:render 读出。
 */
import { Canvas, Rect } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface RenderingModelOptions {
  /** 矩形填充色；fill 属于 cacheProperties */
  fill: string;
  /** set 走 Fabric 内部 _set 并维护 dirty；direct 直接赋值绕过它 */
  assignMode: 'set' | 'direct';
  /** none 只改属性；request 调用 canvas.requestRenderAll() */
  refreshMode: 'none' | 'request';
  /** 是否启用 enableRetinaScaling */
  enableRetina: boolean;
}

/** 派生读数：由 readout 显示 */
export interface RenderingModelSnapshot {
  objectFill: string;
  cacheDirty: string;
  renderCount: number;
  cssSize: string;
  pixelSize: string;
  retinaScaling: number;
}

export interface RenderingModelInstance {
  update(options: RenderingModelOptions): void;
  dispose(): void;
}

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const RECT_SIZE = { width: 180, height: 120 };

export function createRenderingModel(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: RenderingModelSnapshot) => void,
): RenderingModelInstance {
  // 构造后 canvasEl 会被包进 wrapper div，与上层画布叠在一起
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  const rect = new Rect({
    left: (INITIAL_SIZE.width - RECT_SIZE.width) / 2,
    top: (INITIAL_SIZE.height - RECT_SIZE.height) / 2,
    width: RECT_SIZE.width,
    height: RECT_SIZE.height,
    fill: '#4f7cff',
  });
  // renderOnAddRemove 默认 true：add 自动 requestRenderAll，完成首帧渲染
  fabricCanvas.add(rect);

  let renderCount = 0;
  fabricCanvas.on('after:render', (event) => {
    // renderTop()（只刷上层）也会派发 after:render，这里只统计下层整帧重绘
    if (event.ctx === fabricCanvas.contextContainer) {
      renderCount += 1;
    }
    emitSnapshot();
  });

  // enableRetinaScaling 构造默认为 true，这里只跟踪开关状态
  let retinaEnabled = true;

  function emitSnapshot() {
    const lower = fabricCanvas.lowerCanvasEl;
    emit({
      objectFill: String(rect.fill),
      cacheDirty: rect.dirty ? '是' : '否',
      renderCount,
      cssSize: `${fabricCanvas.width}×${fabricCanvas.height}`,
      pixelSize: `${lower.width}×${lower.height}`,
      retinaScaling: fabricCanvas.getRetinaScaling(),
    });
  }

  function syncSize() {
    // wrapperEl 的父级就是共享舞台；createResizeObserver 观察的正是“传入元素的父级”
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    rect.set({
      left: (width - RECT_SIZE.width) / 2,
      top: (height - RECT_SIZE.height) / 2,
    });
    // setDimensions 按当前 retina 倍率重设物理像素，并自动 requestRenderAll
    fabricCanvas.setDimensions({ width, height });
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(options: RenderingModelOptions) {
    if (options.assignMode === 'set') {
      // set() 内部比对值：变化且属性属于 cacheProperties 时置 dirty；值相同则无动作
      rect.set('fill', options.fill);
    } else if (rect.fill !== options.fill) {
      // 直接赋值绕过 _set：dirty 不变，对象缓存位图保持旧内容
      rect.fill = options.fill;
    }

    if (options.enableRetina !== retinaEnabled) {
      retinaEnabled = options.enableRetina;
      fabricCanvas.set('enableRetinaScaling', retinaEnabled);
      syncSize(); // 倍率改动后要重设尺寸，才会重建物理像素
    }

    if (options.refreshMode === 'request') {
      // 下一帧统一重绘；同一帧内多次调用也只渲染一次
      fabricCanvas.requestRenderAll();
    }

    emitSnapshot();
  }

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      void fabricCanvas.dispose();
    },
  };
}
