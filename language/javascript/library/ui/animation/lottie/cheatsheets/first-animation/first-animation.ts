/**
 * 范例：lottie.loadAnimation 的最小闭环——容器、渲染器、动画来源三要素，
 * 外加 loop / autoplay 两个创建参数。
 * 前置状态：动画数据是同目录的 first-animation.json（30fps、60 帧、蓝色圆点从左滑到右）。
 * 主要操作：Controls 切换 loop、autoplay 后，销毁旧实例并按新参数重新 loadAnimation。
 * 预期结果：autoplay=false 创建后停在第 0 帧不播；loop=false 播完一轮停在末帧、
 *           「已循环次数」保持 0（结束只触发 complete）；loop=true 循环计数持续递增。
 * 阅读主线：按需注入 CDN 脚本 → loadAnimation 三要素创建实例 →
 *           enterFrame / loopComplete / complete 驱动读数 → update 时 destroy 再重建 → dispose 释放。
 */

interface LottieAnimationInstance {
  currentFrame: number;
  isPaused: boolean;
  destroy(): void;
  addEventListener(name: string, callback: (event?: unknown) => void): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    container: HTMLElement;
    renderer: 'svg';
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

export interface FirstAnimationOptions {
  loop: boolean;
  autoplay: boolean;
}

export interface FirstAnimationSnapshot {
  frame: number;
  status: string;
  loops: number;
}

export interface FirstAnimationInstance {
  update(options: FirstAnimationOptions): void;
  dispose(): void;
}

export function createFirstAnimation(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FirstAnimationSnapshot) => void,
): FirstAnimationInstance {
  // 共享外壳提供的是 <canvas>，而 SVG 渲染器需要一个普通容器：
  // 隐藏画布，插入一个 div 作为 loadAnimation 的 container。
  canvas.style.display = 'none';
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  });
  stage.insertBefore(container, canvas);

  let animation: LottieAnimationInstance | undefined;
  let loadToken = 0;
  let cancelled = false;
  let loops = 0;
  let options: FirstAnimationOptions = { loop: true, autoplay: true };

  // 读数来自实例属性：currentFrame 是当前帧号，isPaused 区分播放中与已暂停。
  // 帧号取整数索引（向下取整），循环回卷瞬间的 59.x 不会显示成 60。
  function emitSnapshot() {
    if (!animation) {
      return;
    }
    emit({
      frame: Math.floor(animation.currentFrame),
      status: animation.isPaused ? '已暂停' : '播放中',
      loops,
    });
  }

  function destroyCurrent() {
    animation?.destroy();
    animation = undefined;
  }

  function load() {
    destroyCurrent();
    const token = ++loadToken;
    loops = 0;
    emit({ frame: 0, status: '加载中', loops: 0 });

    loadLottie()
      .then((lottie) => {
        // 快速切换开关时旧的加载结果直接作废。
        if (cancelled || token !== loadToken) {
          return;
        }

        // 本课核心调用：container、renderer、path 三要素决定
        // 动画渲染到哪、怎么画、画什么；loop / autoplay 是创建时的播放开关。
        // 浏览器页面里 path 直接写相对地址（如 'first-animation.json'）；
        // 文档页的资源地址经打包器改名，用 new URL 从模块位置解析出真实地址。
        animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: options.loop,
          autoplay: options.autoplay,
          path: new URL('./first-animation.json', import.meta.url).href,
        });

        animation.addEventListener('enterFrame', emitSnapshot);
        animation.addEventListener('DOMLoaded', emitSnapshot);
        animation.addEventListener('loopComplete', () => {
          loops += 1;
          emitSnapshot();
        });
        // loop=false 播完一轮只触发 complete：动画 pause 在末帧，不产生 loopComplete。
        animation.addEventListener('complete', emitSnapshot);
      })
      .catch(() => {
        if (!cancelled && token === loadToken) {
          emit({ frame: 0, status: '加载失败', loops: 0 });
        }
      });
  }

  return {
    update(next) {
      // loop / autoplay 是 loadAnimation 的创建参数：
      // 改变它们必须销毁旧实例、按新参数重建，而不是在旧实例上补改。
      options = next;
      load();
    },
    dispose() {
      cancelled = true;
      destroyCurrent();
      discardLottieScript();
    },
  };
}
