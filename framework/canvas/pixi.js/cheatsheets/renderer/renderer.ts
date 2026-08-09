/**
 * 范例介绍：演示 resolution 如何改变渲染像素密度，从而影响 HiDPI 屏上的清晰度。
 *
 * 演示内容：一组 1px 细线圆环 + 小号文字。调低 resolution 时文字和圆环边缘明显发糊，
 * 调高到 2（接近 Retina 设备像素比）时恢复锐利。
 *
 * 输入：resolution（渲染分辨率，对应 app.renderer.resolution）。
 * 主要操作：apply 把 resolution 映射到 app.renderer.resize(cssW, cssH, resolution)，
 * 重设后备像素尺寸；舞台 CSS 固定画布显示尺寸，所以只有清晰度和后备像素数会变。
 *
 * 预期结果：
 *   - resolution=0.5：文字发糊、圆环边缘锯齿；后备像素 ≈ 逻辑尺寸 × 0.5。
 *   - resolution=1：正常；后备像素 = 逻辑尺寸。
 *   - resolution=2：锐利；后备像素 = 逻辑尺寸 × 2（与 Retina 设备像素比一致）。
 *   - 读数显示渲染器类型、当前 resolution、设备像素比、后备像素尺寸与逻辑尺寸。
 *
 * 阅读主线：先看 app.init 的 preference 与画布复用，再看 applyResolution 如何用
 * resize 的第三参改变分辨率，最后看读数里后备像素随 resolution 缩放、逻辑尺寸不变。
 */
import { Application, Graphics, Text } from 'pixi.js';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface RendererOptions {
  resolution: number;
}

export interface RendererSnapshot {
  backend: string;
  resolution: number;
  devicePixelRatio: number;
  backing: string;
  screen: string;
}

export interface RendererInstance {
  update(options: RendererOptions): void;
  dispose(): void;
}

const MONO = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export function createRenderer(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RendererSnapshot) => void,
): RendererInstance {
  const app = new Application();
  let disposed = false;
  let destroyed = false;
  let ready = false;
  let current: RendererOptions = { resolution: 1 };
  let onScreen = false;

  // 渲染器类名含后端标识，提取为可读标签（WebGLRenderer / WebGPURenderer / CanvasRenderer）
  function backendLabel(): string {
    const name = app.renderer.constructor.name;
    if (name.includes('WebGPU')) return 'WebGPU';
    if (name.includes('WebGL')) return 'WebGL';
    if (name.includes('Canvas')) return 'Canvas';
    return name;
  }

  function emitSnapshot() {
    if (!ready) {
      return;
    }
    emit({
      backend: backendLabel(),
      resolution: app.renderer.resolution,
      devicePixelRatio: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      backing: `${canvas.width} × ${canvas.height}`,
      screen: `${Math.round(app.screen.width)} × ${Math.round(app.screen.height)}`,
    });
  }

  // 细线圆环：1px 描边在低分辨率下会出现明显锯齿，用来直观反映像素密度差异。
  const rings = new Graphics();
  for (const radius of [18, 30, 42, 54, 66]) {
    rings.circle(0, 0, radius).stroke({ color: 0x93c5fd, width: 1, alpha: 0.75 });
  }

  const title = new Text({
    text: 'HiDPI 清晰度对比',
    style: { ...MONO, fontSize: 16, fill: 0xe2e8f0 },
  });
  title.anchor.set(0.5);

  // 小号文字对像素密度最敏感：低分辨率时光栅化像素不足，字形边缘发糊。
  const sample = new Text({
    text: 'The quick brown fox jumps\n敏捷的棕色狐狸跃过懒狗',
    style: { ...MONO, fontSize: 12, fill: 0xcbd5e1, lineHeight: 18 },
  });
  sample.anchor.set(0.5);

  const resLabel = new Text({
    text: 'resolution = 1',
    style: { ...MONO, fontSize: 12, fill: 0x94a3b8 },
  });
  resLabel.anchor.set(0.5);

  // 根据画布逻辑尺寸垂直排列标题、圆环、样例文字与分辨率标签。
  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;
    title.position.set(cx, h * 0.18);
    rings.position.set(cx, h * 0.46);
    sample.position.set(cx, h * 0.78);
    resLabel.position.set(cx, h * 0.9);
  }

  // 核心机制：把 resolution 映射到 renderer.resize 的第三参，重设后备像素尺寸。
  // 舞台 CSS 固定画布显示尺寸（width/height: 100%），所以分辨率只改清晰度，不改显示大小。
  function applyResolution(opts: RendererOptions) {
    current = opts;
    if (!ready) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height, opts.resolution);
    resLabel.text = `resolution = ${opts.resolution}`;
    layout();
    emitSnapshot();
  }

  const initial = readCanvasSize(canvas);
  // preference 固定 webgl 保证演示稳定；实际项目可设 'webgpu' 让 autoDetectRenderer 尝试更高性能后端。
  const initPromise = app.init({
    canvas,
    width: Math.max(320, initial.width),
    height: Math.max(240, initial.height),
    preference: 'webgl',
    background: '#0f172a',
    antialias: true,
  });

  initPromise.then(() => {
    if (disposed) {
      destroyAll();
      return;
    }
    ready = true;
    app.stage.addChild(title, rings, sample, resLabel);
    applyResolution(current);
  });

  function destroyAll() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    app.destroy(true, { children: true });
  }

  // 画布尺寸变化时同步 renderer 并重排（保持当前 resolution）。
  const resizeObserver = createResizeObserver(canvas, () => {
    if (!app.renderer) {
      return;
    }
    const size = readCanvasSize(canvas);
    app.renderer.resize(size.width, size.height, current.resolution);
    layout();
    emitSnapshot();
  });

  // 离屏时暂停渲染循环以省 GPU；回到视口时恢复。
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      if (!ready) {
        return;
      }
      onScreen = entries.at(-1)?.isIntersecting ?? false;
      if (onScreen) {
        app.start();
      } else {
        app.stop();
      }
    },
    { rootMargin: '200px 0px' },
  );
  visibilityObserver.observe(canvas);

  return {
    update(options) {
      applyResolution(options);
    },
    dispose() {
      disposed = true;
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      if (app.renderer) {
        destroyAll();
      } else {
        initPromise.then(destroyAll);
      }
    },
  };
}
