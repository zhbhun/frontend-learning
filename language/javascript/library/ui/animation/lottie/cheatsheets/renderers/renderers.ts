/**
 * 范例：同一份动画数据（renderers.json）分别在 svg / canvas / html 三种渲染器下播放。
 * 前置状态：renderer 是 loadAnimation 的创建参数，不传时默认 'svg'。
 * 主要操作：Controls 切换 renderer 后，销毁旧实例、清空容器、按新渲染器重建。
 * 预期结果：svg 模式容器里是一个 <svg> 加每图层一个 <g>（DOM 节点十来个）；
 *           canvas 模式只有一个 <canvas>（DOM 节点数为 1）；html 模式每图层一个
 *           <div>、内嵌 <svg> 混排；三种模式下动画外观一致。
 * 阅读主线：按需注入 CDN 脚本 → loadAnimation 创建实例 → DOMLoaded 后统计
 *           容器内的 DOM 节点数 → 切 renderer 时 destroy + 清空 + 重建 → dispose 释放。
 */

type RendererType = 'svg' | 'canvas' | 'html';

interface LottieAnimationInstance {
  destroy(): void;
  addEventListener(name: string, callback: (event?: unknown) => void): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    container: HTMLElement;
    renderer: RendererType;
    rendererSettings?: { dpr?: number };
    loop: boolean;
    autoplay: boolean;
    path: string;
  }): LottieAnimationInstance;
}

declare global {
  interface Window {
    lottie?: LottieGlobal;
  }
}

// lottie-web 通过 CDN 的 script 标签引入，加载完成后暴露全局对象 lottie。
// 文档页的渲染环境没有现成的 script 节点，这里按需注入，等待 onload 后继续。
const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';

let pendingScript: HTMLScriptElement | undefined;

export function loadLottie(): Promise<LottieGlobal> {
  // 已加载过则全局对象直接可用，无需重复注入。
  if (window.lottie) {
    return Promise.resolve(window.lottie);
  }

  if (!pendingScript) {
    pendingScript = document.createElement('script');
    pendingScript.src = LOTTIE_CDN;
    pendingScript.async = true;
    document.head.append(pendingScript);
  }

  const script = pendingScript;
  return new Promise((resolve, reject) => {
    script.addEventListener(
      'load',
      () => resolve(window.lottie as LottieGlobal),
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error('lottie-web 脚本加载失败，请检查网络连接。')),
      { once: true },
    );
  });
}

export function discardLottieScript(): void {
  // 页面卸载时脚本可能仍在下载，此时移除注入节点；
  // 全局对象已就绪则无法也无需回收。
  if (!window.lottie && pendingScript) {
    pendingScript.remove();
    pendingScript = undefined;
  }
}

export interface RenderersOptions {
  renderer: RendererType;
}

export interface RenderersSnapshot {
  renderer: RendererType;
  domNodes: number;
}

export interface RenderersInstance {
  update(options: RenderersOptions): void;
  dispose(): void;
}

export function createRenderers(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RenderersSnapshot) => void,
): RenderersInstance {
  // 共享外壳提供的是 <canvas>，而动画容器需要一个普通 div：
  // 隐藏画布，插入一个居中的容器作为 loadAnimation 的 container。
  canvas.style.display = 'none';
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  });

  // 容器有明确宽高，且 position: relative：
  // svg / canvas 按容器等比缩放，html 渲染器的图层 div 以容器定位。
  // 虚线框标出容器的边界，方便观察三种渲染器分别往里面放了什么。
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    aspectRatio: '300 / 160',
    border: '1px dashed #94a3b8',
    borderRadius: '8px',
    overflow: 'hidden',
  });

  wrapper.append(container);
  stage.insertBefore(wrapper, canvas);

  let animation: LottieAnimationInstance | undefined;
  let loadToken = 0;
  let cancelled = false;
  let options: RenderersOptions = { renderer: 'svg' };

  // 读数核心：统计容器里 lottie 创建的全部元素。
  // svg 模式 = 1 个 <svg> + 每图层节点；canvas 模式 = 1 个 <canvas>；
  // html 模式 = 每图层一个 <div>（内嵌 <svg>）。
  function countNodes(): number {
    return container.querySelectorAll('*').length;
  }

  function emitSnapshot() {
    emit({ renderer: options.renderer, domNodes: countNodes() });
  }

  function destroyCurrent() {
    // destroy() 会移除渲染器写入容器的 DOM，再清一次容器兜底。
    animation?.destroy();
    animation = undefined;
    container.replaceChildren();
  }

  function load() {
    destroyCurrent();
    const token = ++loadToken;
    emit({ renderer: options.renderer, domNodes: 0 });

    loadLottie()
      .then((lottie) => {
        // 快速切换渲染器时，旧的加载结果直接作废。
        if (cancelled || token !== loadToken) {
          return;
        }

        // 本课核心调用：同一份 JSON，只改 renderer 创建参数。
        // rendererSettings.dpr 让 canvas 渲染器在高分屏上保持清晰；
        // svg / html 渲染器不使用 dpr，传了也无副作用。
        animation = lottie.loadAnimation({
          container,
          renderer: options.renderer,
          rendererSettings: {
            dpr: Math.min(window.devicePixelRatio || 1, 2),
          },
          loop: true,
          autoplay: true,
          path: new URL('./renderers.json', import.meta.url).href,
        });

        // DOMLoaded 表示渲染器已把 DOM 建好，此时统计节点数才是最终值。
        animation.addEventListener('DOMLoaded', emitSnapshot);
      })
      .catch(() => {
        if (!cancelled && token === loadToken) {
          emit({ renderer: options.renderer, domNodes: 0 });
        }
      });
  }

  return {
    update(next) {
      // renderer 是创建参数：改变它必须销毁旧实例、按新渲染器重建。
      if (next.renderer === options.renderer && animation) {
        return;
      }
      options = next;
      load();
    },
    dispose() {
      cancelled = true;
      destroyCurrent();
      wrapper.remove();
      discardLottieScript();
    },
  };
}
