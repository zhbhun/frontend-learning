/**
 * 范例：同一份 Lottie JSON 分别用 path 与 animationData 两种方式加载。
 *
 * - 前置：lottie-web 通过 CDN script 注入；data.json 与本文件同目录。
 *   path 模式的 URL 用 Vite 的 `?url&no-inline` 导入取得，由打包器解析地址，
 *   同时避免小文件在构建时被内联成 data: URL（XMLHttpRequest 无法加载）。
 * - 操作：Controls 切换「加载方式」，每次切换销毁旧实例后重新加载同一份动画。
 * - 预期：path 模式出现对 data.json 的资源请求，耗时包含请求往返；
 *   animationData 模式零请求，耗时只包含 loadAnimation 到 DOMLoaded 的装配过程。
 * - 阅读主线：rebuild() 中两种方式只有 loadAnimation 的参数不同。
 */
import { createResizeObserver } from '../../assets/canvas-runtime.js';
import dataUrl from './data.json?url&no-inline';
import dataText from './data.json?raw';

export type LoadMode = 'path' | 'animationData';

export interface ExampleArgs {
  mode: LoadMode;
}

export interface ExampleSnapshot {
  mode: LoadMode;
  /** 从调用 loadAnimation 到 DOMLoaded 的耗时；未完成时为 null。 */
  loadMs: number | null;
  /** 本次加载期间针对 data.json 的资源请求数；未完成时为 null。 */
  requests: number | null;
  /** 加载失败（例如 CDN 不可达、data_failed 事件）时为 true。 */
  failed: boolean;
}

export interface ExampleInstance {
  update(args: ExampleArgs): void;
  dispose(): void;
}

interface LottieAnimationItem {
  addEventListener(event: string, handler: () => void): void;
  resize(): void;
  destroy(): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    renderer: string;
    loop: boolean;
    autoplay: boolean;
    rendererSettings: Record<string, unknown>;
    path?: string;
    animationData?: unknown;
  }): LottieAnimationItem;
}

const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';
const FALLBACK_SIZE = { width: 640, height: 360 };

let lottiePromise: Promise<LottieGlobal> | null = null;

/** 按课程约束从 CDN 引入 lottie-web，整个页面只注入一次。 */
function loadLottie(): Promise<LottieGlobal> {
  const globalWindow = window as unknown as { lottie?: LottieGlobal };
  if (globalWindow.lottie) {
    return Promise.resolve(globalWindow.lottie);
  }
  if (!lottiePromise) {
    lottiePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LOTTIE_CDN;
      script.addEventListener('load', () => {
        if (globalWindow.lottie) {
          resolve(globalWindow.lottie);
        } else {
          reject(new Error('lottie-web 脚本已加载，但 window.lottie 不存在。'));
        }
      });
      script.addEventListener('error', () => {
        lottiePromise = null;
        reject(new Error('lottie-web CDN 加载失败，请检查网络。'));
      });
      document.head.appendChild(script);
    });
  }
  return lottiePromise;
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  // 资源计时条目记录的是完整地址，计数前先把导入的 URL 解析成绝对地址
  const resolvedDataUrl = new URL(dataUrl, document.baseURI).href;
  let currentMode: LoadMode = 'path';
  let started = false;
  let animation: LottieAnimationItem | null = null;
  let runId = 0;
  let disposed = false;

  function sizeCanvas() {
    const parent = canvas.parentElement;
    const width =
      parent?.clientWidth || canvas.clientWidth || FALLBACK_SIZE.width;
    const height =
      parent?.clientHeight || canvas.clientHeight || FALLBACK_SIZE.height;
    // lottie-web 的 canvas 渲染器读取当前画布尺寸后按 dpr 放大，
    // 因此每次重建或同步尺寸前，先把画布还原为 CSS 像素。
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
  }

  function emitSnapshot(overrides: Partial<ExampleSnapshot>) {
    emit({
      mode: currentMode,
      loadMs: null,
      requests: null,
      failed: false,
      ...overrides,
    });
  }

  async function rebuild(mode: LoadMode) {
    const run = ++runId;
    animation?.destroy();
    animation = null;
    sizeCanvas();
    emitSnapshot({ mode, loadMs: null, requests: null });

    let lottie: LottieGlobal;
    try {
      lottie = await loadLottie();
    } catch {
      if (!disposed && run === runId) {
        emitSnapshot({ mode, failed: true });
      }
      return;
    }
    if (disposed || run !== runId) {
      return;
    }

    // 统计本次加载期间针对 data.json 的资源请求（命中 HTTP 缓存时同样会计数）
    let requests = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === resolvedDataUrl) {
          requests += 1;
        }
      }
    });
    observer.observe({ type: 'resource' });

    // 与真实项目一致：数据准备（打包器内联对应模块求值）不计入加载耗时
    const animationData =
      mode === 'animationData' ? JSON.parse(dataText) : undefined;
    const startedAt = performance.now();
    const baseParams = {
      renderer: 'canvas',
      loop: true,
      autoplay: true,
      rendererSettings: {
        context,
        clearCanvas: true,
        preserveAspectRatio: 'xMidYMid meet',
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      },
    };
    // 两种加载方式只有这里的参数不同：path 传 URL 交给 lottie-web 请求，
    // animationData 直接传入随打包内联的数据对象。
    animation =
      mode === 'path'
        ? lottie.loadAnimation({ ...baseParams, path: dataUrl })
        : lottie.loadAnimation({ ...baseParams, animationData });

    let finished = false;
    const finish = (failed: boolean) => {
      if (finished || disposed || run !== runId) {
        return;
      }
      finished = true;
      window.clearTimeout(fallback);
      observer.disconnect();
      emitSnapshot({
        mode,
        loadMs: failed ? null : performance.now() - startedAt,
        requests: failed ? null : requests,
        failed,
      });
    };
    // DOMLoaded 由 lottie-web 通过 setTimeout(0) 异步触发，先挂监听不会错过
    animation.addEventListener('DOMLoaded', () => finish(false));
    animation.addEventListener('data_failed', () => finish(true));
    const fallback = window.setTimeout(() => finish(true), 8000);
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    sizeCanvas();
    animation?.resize();
  });

  emitSnapshot({});

  return {
    update(args) {
      if (started && args.mode === currentMode) {
        return;
      }
      currentMode = args.mode;
      started = true;
      void rebuild(args.mode);
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      animation?.destroy();
      animation = null;
    },
  };
}
