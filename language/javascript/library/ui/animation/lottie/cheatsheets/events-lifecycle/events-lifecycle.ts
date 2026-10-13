/**
 * 范例：事件日志——监听动画实例从加载、播放到销毁的全部生命周期事件。
 * 前置状态：动画数据是同目录的 events-lifecycle.json（30fps、48 帧、旋转脉冲条）。
 * 主要操作：Controls 切换 loop、autoplay 后，销毁旧实例并按新参数重新 loadAnimation。
 * 预期结果：读数「事件日志」滚动显示最近 5 组事件——加载段为
 *           config_ready → data_ready → enterFrame×1 → DOMLoaded；播放段
 *           enterFrame 连续触发折叠为计数；loop=true 末端反复 loopComplete，
 *           loop=false 末端只触发一次 complete；切换开关时日志出现 destroy。
 * 阅读主线：loadAnimation 创建实例 → addEventListener 挂全生命周期事件 →
 *           事件写入折叠日志并驱动节流读数 → update 时 destroy 旧实例重建 → dispose 释放。
 */

// —— lottie-web 通过 CDN 的 script 标签引入，加载完成后暴露全局对象 lottie ——

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

const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';

let pendingScript: HTMLScriptElement | undefined;

function loadLottie(): Promise<LottieGlobal> {
  // 全局对象已就绪则直接复用，无需重复注入脚本。
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
      () => {
        // 失败后清空引用，下次调用可以重新注入。
        pendingScript = undefined;
        reject(new Error('lottie-web 脚本加载失败，请检查网络连接。'));
      },
      { once: true },
    );
  });
}

function discardLottieScript(): void {
  // 页面卸载时脚本可能仍在下载，此时移除注入节点；
  // 全局对象已就绪则无法也无需回收。
  if (!window.lottie && pendingScript) {
    pendingScript.remove();
    pendingScript = undefined;
  }
}

// —— 事件日志范例本体 ——

export interface EventsLifecycleOptions {
  loop: boolean;
  autoplay: boolean;
}

export interface EventsLifecycleSnapshot {
  status: string;
  frame: number;
  loops: number;
  log: string;
}

export interface EventsLifecycleInstance {
  update(options: EventsLifecycleOptions): void;
  dispose(): void;
}

// 日志只保留最近几组事件：连续同名事件折叠为一个计数条目，
// enterFrame 每帧触发，不折叠会把读数区刷满。
const LOG_LIMIT = 5;

export function createEventsLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EventsLifecycleSnapshot) => void,
): EventsLifecycleInstance {
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
  let options: EventsLifecycleOptions = { loop: true, autoplay: true };
  let loadToken = 0;
  let cancelled = false;
  let loaded = false;
  let loops = 0;
  let trailingTimer = 0;
  const log: Array<{ name: string; count: number }> = [];

  function record(name: string) {
    const last = log[log.length - 1];
    if (last && last.name === name) {
      last.count += 1;
      return;
    }
    log.push({ name, count: 1 });
    if (log.length > LOG_LIMIT) {
      log.shift();
    }
  }

  function emitSnapshot() {
    // 状态取自实例属性：isPaused 区分播放中与已暂停；
    // currentFrame 向下取整，循环回卷瞬间的 47.x 不会显示成 48。
    let status = '已暂停';
    if (!loaded) {
      status = '加载中';
    } else if (animation && !animation.isPaused) {
      status = '播放中';
    }
    emit({
      status,
      frame: animation ? Math.floor(animation.currentFrame) : 0,
      loops,
      // enterFrame 恒带计数以凸显逐帧语义；其余事件只在连续重复时显示计数。
      log:
        log
          .map((entry) =>
            entry.name === 'enterFrame' || entry.count > 1
              ? `${entry.name}×${entry.count}`
              : entry.name,
          )
          .join(' → ') || '（等待事件）',
    });
  }

  function recordEvent(name: string) {
    record(name);
    emitSnapshot();
    // 读数约 100ms 节流一次，关键事件可能落在节流窗口内被吞掉：
    // 非高频事件追加一次兜底刷新，保证 complete / DOMLoaded 这类终点可见。
    if (name !== 'enterFrame') {
      window.clearTimeout(trailingTimer);
      trailingTimer = window.setTimeout(emitSnapshot, 150);
    }
  }

  function destroyCurrent() {
    // destroy() 会先触发 destroy 事件（日志记录它），再清空全部监听；
    // 此后旧实例不会再发出任何事件。
    animation?.destroy();
    animation = undefined;
  }

  function load() {
    destroyCurrent();
    const token = ++loadToken;
    loaded = false;
    loops = 0;
    emitSnapshot();

    loadLottie()
      .then((lottie) => {
        // 快速切换开关时，过期的加载结果直接作废。
        if (cancelled || token !== loadToken) {
          return;
        }

        animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: options.loop,
          autoplay: options.autoplay,
          // 浏览器页面里 path 直接写相对地址即可；文档页的资源地址
          // 经打包器改名，用 new URL 从模块位置解析出真实地址。
          path: new URL('./events-lifecycle.json', import.meta.url).href,
        });

        // 加载阶段：config_ready → data_ready →（初次渲染的 enterFrame）→ DOMLoaded。
        animation.addEventListener('config_ready', () => recordEvent('config_ready'));
        animation.addEventListener('data_ready', () => recordEvent('data_ready'));
        animation.addEventListener('data_failed', () => recordEvent('data_failed'));
        animation.addEventListener('DOMLoaded', () => {
          loaded = true;
          recordEvent('DOMLoaded');
        });
        // 播放循环：每帧触发 enterFrame；循环回卷触发 loopComplete；播完触发 complete。
        animation.addEventListener('enterFrame', () => recordEvent('enterFrame'));
        animation.addEventListener('loopComplete', () => {
          loops += 1;
          recordEvent('loopComplete');
        });
        animation.addEventListener('complete', () => recordEvent('complete'));
        // destroy 是实例的最后一个事件：先于监听解绑触发，仍能收到。
        animation.addEventListener('destroy', () => recordEvent('destroy'));
      })
      .catch(() => {
        if (!cancelled && token === loadToken) {
          recordEvent('data_failed');
        }
      });
  }

  load();

  return {
    update(next) {
      // loop / autoplay 是 loadAnimation 的创建参数：
      // 切换时销毁旧实例（日志出现 destroy）并按新参数重建。
      options = next;
      load();
    },
    dispose() {
      cancelled = true;
      window.clearTimeout(trailingTimer);
      destroyCurrent();
      discardLottieScript();
    },
  };
}
