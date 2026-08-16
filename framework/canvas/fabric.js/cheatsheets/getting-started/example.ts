/**
 * 范例介绍：演示「创建画布 → 渲染第一个图形」的最小闭环，以及画布构造选项的真实影响。
 * 读者输入：画布类型（交互 Canvas / 纯渲染 StaticCanvas）、宽高、背景色、
 * 第一个图形（Rect / Circle / Triangle）、框选开关（仅交互画布生效）。
 * 主要操作：调整输入后画布就地更新；切换画布类型会先 dispose 旧实例再重建
 * （同一元素不能同时被两个画布实例管理，重复初始化会直接抛错）。
 * 预期结果：尺寸与背景随输入变化，图形保持居中；交互画布点击图形会出现控件，
 * 读数「选中对象」随之变化；静态画布对指针完全无响应。
 * 阅读主线：createGettingStarted（建布与事件绑定）→ sync（就地更新与销毁重建）→
 * makeShape（第一个图形的选项与默认 origin）。
 */
import { Canvas, Circle, Rect, StaticCanvas, Triangle, version } from 'fabric';
import type { FabricObject } from 'fabric';

export interface GettingStartedOptions {
  canvasType: 'canvas' | 'static';
  width: number;
  height: number;
  backgroundColor: string;
  shape: 'rect' | 'circle' | 'triangle';
  selection: boolean;
}

export interface GettingStartedSnapshot {
  version: string;
  canvasType: 'Canvas' | 'StaticCanvas';
  dimensions: string;
  activeLabel: string;
}

export interface GettingStartedInstance {
  update(options: GettingStartedOptions): void;
  dispose(): void;
}

const SHAPE_FILL = '#4f7cff';

function makeShape(
  shape: GettingStartedOptions['shape'],
  width: number,
  height: number,
): FabricObject {
  // originX / originY 默认 'center'：left / top 就是图形中心的坐标
  switch (shape) {
    case 'circle':
      return new Circle({
        left: width / 2,
        top: height / 2,
        radius: 48,
        fill: SHAPE_FILL,
      });
    case 'triangle':
      return new Triangle({
        left: width / 2,
        top: height / 2,
        width: 120,
        height: 96,
        fill: SHAPE_FILL,
      });
    default:
      return new Rect({
        left: width / 2,
        top: height / 2,
        width: 140,
        height: 90,
        rx: 8,
        ry: 8,
        fill: SHAPE_FILL,
      });
  }
}

export function createGettingStarted(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: GettingStartedSnapshot) => void,
): GettingStartedInstance {
  let options: GettingStartedOptions = {
    canvasType: 'canvas',
    width: 480,
    height: 280,
    backgroundColor: '',
    shape: 'rect',
    selection: true,
  };
  let canvas: Canvas | StaticCanvas | undefined;
  let currentShape: GettingStartedOptions['shape'] | undefined;
  let disposed = false;
  // 串行化重建与更新：销毁是异步的，重建必须等 DOM 还原后才能开始
  let queue: Promise<void> = Promise.resolve();

  function isInteractive(instance: Canvas | StaticCanvas): instance is Canvas {
    return instance instanceof Canvas;
  }

  function emitSnapshot() {
    if (!canvas) {
      return;
    }
    const interactive = isInteractive(canvas);
    const active = interactive ? canvas.getActiveObject() : undefined;
    emit({
      version,
      canvasType: interactive ? 'Canvas' : 'StaticCanvas',
      dimensions: `${canvas.getWidth()} × ${canvas.getHeight()}`,
      activeLabel: interactive
        ? active
          ? active.type
          : '未选中（点击图形试试）'
        : '—（无交互层）',
    });
  }

  function createCanvas(): Canvas | StaticCanvas {
    const shared = {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor,
    };
    // selection 是交互画布独有的构造选项，静态画布没有交互选项
    const instance: Canvas | StaticCanvas =
      options.canvasType === 'canvas'
        ? new Canvas(canvasEl, { ...shared, selection: options.selection })
        : new StaticCanvas(canvasEl, shared);
    instance.add(makeShape(options.shape, options.width, options.height));
    currentShape = options.shape;
    if (isInteractive(instance)) {
      // 选中态变化时刷新读数，让交互层的变化可核对
      instance.on('selection:created', emitSnapshot);
      instance.on('selection:updated', emitSnapshot);
      instance.on('selection:cleared', emitSnapshot);
    }
    return instance;
  }

  async function sync() {
    if (disposed) {
      return;
    }
    const wantInteractive = options.canvasType === 'canvas';
    if (canvas && isInteractive(canvas) !== wantInteractive) {
      const previous = canvas;
      canvas = undefined;
      currentShape = undefined;
      // 等待元素还原后再重建，否则会触发「重复初始化」报错
      await previous.dispose();
    }
    if (!canvas) {
      canvas = createCanvas();
      emitSnapshot();
      return;
    }
    const instance = canvas;
    // 就地更新尺寸与背景（setDimensions 内部会请求重渲染）
    instance.setDimensions({ width: options.width, height: options.height });
    instance.set({ backgroundColor: options.backgroundColor });
    if (isInteractive(instance)) {
      instance.set({ selection: options.selection });
    }
    if (currentShape !== options.shape) {
      instance.remove(...instance.getObjects());
      instance.add(makeShape(options.shape, options.width, options.height));
      currentShape = options.shape;
    } else {
      // 尺寸变化后让图形保持在画布中心
      instance.forEachObject((object) => instance.centerObject(object));
    }
    instance.requestRenderAll();
    emitSnapshot();
  }

  canvas = createCanvas();
  emitSnapshot();

  return {
    update(next: GettingStartedOptions) {
      options = next;
      queue = queue.then(sync, sync).catch(() => undefined);
    },
    dispose() {
      disposed = true;
      const existing = canvas;
      canvas = undefined;
      currentShape = undefined;
      void existing?.dispose();
    },
  };
}
