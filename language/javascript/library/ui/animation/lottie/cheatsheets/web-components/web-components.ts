/**
 * 范例：用 <dotlottie-wc> 组件播放动画，并操作它的两套控制面。
 * 前置状态：动画数据是同目录的 web-components.json（30fps、90 帧，
 *           橙色圆角方块从左行进一整趟，同时旋转一圈）；组件脚本与 WASM
 *           运行时来自公共 CDN，需要网络可达。
 * 主要操作：Controls 切 autoplay（加载期参数，重建组件元素）、切 loop 与拖
 *           speed（通过 element.dotLottie 实例的 setLoop / setSpeed 热更新）。
 * 预期结果：autoplay=false 时组件停在初始画面「已暂停」；loop=false 播完第 90
 *           帧停在末帧、「已循环次数」不再增加；speed 变化即时生效、画面不中断。
 * 阅读主线：按需注入 CDN module → 创建组件元素并在标签上声明属性 →
 *           在 element.dotLottie 上接事件驱动读数 → update 区分重建与热更新 →
 *           dispose 销毁实例并移除元素。
 */

interface DotLottieInstance {
  currentFrame: number;
  isPaused: boolean;
  play(): void;
  pause(): void;
  stop(): void;
  setFrame(frame: number): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  destroy(): void;
  addEventListener(
    type: string,
    listener: (event: {
      type: string;
      currentFrame?: number;
      loopCount?: number;
    }) => void,
  ): void;
}

// 组件元素：dotLottie 属性在组件就绪前是 null，升级并连接后指向内部播放器实例。
interface DotLottieWcElement extends HTMLElement {
  dotLottie: DotLottieInstance | null;
}

// dotlottie-wc 通过 CDN 的 module 脚本引入，执行后注册 <dotlottie-wc> 自定义元素。
// 文档页的渲染环境没有现成的 script 节点，这里按需注入，等待自定义元素完成注册。
const DOTLOTTIE_WC_CDN =
  'https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js';

const LOAD_TIMEOUT = 20000;

let pendingScript: HTMLScriptElement | undefined;

export function loadDotLottieWc(): Promise<void> {
  // 已注册过则自定义元素直接可用，无需重复注入。
  if (customElements.get('dotlottie-wc')) {
    return Promise.resolve();
  }

  if (!pendingScript) {
    pendingScript = document.createElement('script');
    pendingScript.type = 'module';
    pendingScript.src = DOTLOTTIE_WC_CDN;
    document.head.append(pendingScript);
  }

  // CDN 加载失败时 whenDefined 永不落定，用超时把失败转成可显示的状态。
  return Promise.race([
    customElements.whenDefined('dotlottie-wc'),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('dotlottie-wc 模块加载超时')), LOAD_TIMEOUT);
    }),
  ]).then(() => undefined);
}

export function discardDotLottieWcScript(): void {
  // 页面卸载时脚本可能仍在下载，此时移除注入节点；
  // 自定义元素已注册则无法也无需回收。
  if (!customElements.get('dotlottie-wc') && pendingScript) {
    pendingScript.remove();
    pendingScript = undefined;
  }
}

export interface WebComponentsOptions {
  autoplay: boolean;
  loop: boolean;
  speed: number;
}

export interface WebComponentsSnapshot {
  frame: number;
  speed: number;
  status: string;
  loops: number;
}

export interface WebComponentsInstance {
  update(options: WebComponentsOptions): void;
  dispose(): void;
}

// 组件在 connectedCallback 里同步创建实例，等它挂上再接事件更稳妥；
// 等不到就按失败处理。
function waitForInstance(
  element: DotLottieWcElement,
  isStale: () => boolean,
): Promise<DotLottieInstance> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    (function check() {
      if (element.dotLottie) {
        resolve(element.dotLottie);
        return;
      }
      if (isStale() || performance.now() - started > LOAD_TIMEOUT) {
        reject(new Error('组件实例创建超时'));
        return;
      }
      requestAnimationFrame(check);
    })();
  });
}

export function createWebComponents(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WebComponentsSnapshot) => void,
): WebComponentsInstance {
  // 共享外壳提供的是 <canvas>，而组件自带内部画布：隐藏画布，
  // 插入一个居中容器承载 <dotlottie-wc> 元素。
  canvas.style.display = 'none';
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }

  const holder = document.createElement('div');
  Object.assign(holder.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  stage.insertBefore(holder, canvas);

  let player: DotLottieWcElement | undefined;
  let loadToken = 0;
  let cancelled = false;
  let failed = false;
  let loops = 0;
  let options: WebComponentsOptions = { autoplay: true, loop: true, speed: 1 };

  // 读数来自实例属性与事件：currentFrame 是当前帧号（向下取整，避免循环
  // 回卷瞬间显示成 90），isPaused 区分播放中与已暂停。
  function emitSnapshot() {
    if (failed) {
      emit({ frame: 0, speed: options.speed, status: '加载失败', loops });
      return;
    }
    const instance = player?.dotLottie;
    if (!instance) {
      emit({ frame: 0, speed: options.speed, status: '加载中', loops });
      return;
    }
    emit({
      frame: Math.floor(instance.currentFrame),
      speed: options.speed,
      status: instance.isPaused ? '已暂停' : '播放中',
      loops,
    });
  }

  function attach(instance: DotLottieInstance) {
    // 事件全部在实例上，组件不向 DOM 派发事件：frame 携带 currentFrame，
    // loop 标记一轮播完，loadError 区分加载失败与正常播放。
    for (const name of ['load', 'play', 'pause', 'stop', 'complete', 'frame']) {
      instance.addEventListener(name, emitSnapshot);
    }
    instance.addEventListener('loop', () => {
      loops += 1;
      emitSnapshot();
    });
    instance.addEventListener('loadError', () => {
      failed = true;
      emitSnapshot();
    });
  }

  function destroyCurrent() {
    // dispose 与重建都走这里：先销毁实例释放运行时资源，再移除元素。
    const instance = player?.dotLottie;
    instance?.destroy();
    player?.remove();
    player = undefined;
  }

  function build() {
    destroyCurrent();
    const token = ++loadToken;
    failed = false;
    loops = 0;
    emit({ frame: 0, speed: options.speed, status: '加载中', loops: 0 });

    loadDotLottieWc()
      .then(() => {
        // 快速切换开关时旧的构建结果直接作废。
        if (cancelled || token !== loadToken) {
          return;
        }

        // 本课核心：声明式创建——播放配置写在标签属性上，而不是 JS 调用参数里。
        // 浏览器页面里 src 直接写相对地址（如 'web-components.json'）；
        // 文档页的资源地址经打包器改名，用 new URL 从模块位置解析出真实地址。
        const element = document.createElement(
          'dotlottie-wc',
        ) as DotLottieWcElement;
        element.setAttribute(
          'src',
          new URL('./web-components.json', import.meta.url).href,
        );
        if (options.autoplay) {
          element.setAttribute('autoplay', '');
        }
        if (options.loop) {
          element.setAttribute('loop', '');
        }
        element.setAttribute('speed', String(options.speed));
        // 组件宿主是 display: block，内部画布铺满宿主：必须给足宽高，
        // 高度塌陷时页面一片空白。
        element.style.width = 'min(480px, 76%)';
        element.style.aspectRatio = '15 / 8';

        holder.append(element);
        player = element;

        return waitForInstance(element, () => cancelled || token !== loadToken).then(
          (instance) => {
            if (cancelled || token !== loadToken) {
              return;
            }
            // 等待期间 Controls 可能已改动：把最新配置补写到实例上。
            instance.setLoop(options.loop);
            instance.setSpeed(options.speed);
            attach(instance);
            emitSnapshot();
          },
        );
      })
      .catch(() => {
        if (!cancelled && token === loadToken) {
          failed = true;
          emitSnapshot();
        }
      });
  }

  build();

  return {
    update(next) {
      // autoplay 是加载期配置：组件没有对应的运行时开关，切换后重建元素；
      // loop / speed 有实例方法，热更新即可，画面不中断。
      const rebuild = next.autoplay !== options.autoplay;
      options = next;
      if (rebuild) {
        build();
        return;
      }
      const instance = player?.dotLottie;
      if (instance) {
        instance.setLoop(next.loop);
        instance.setSpeed(next.speed);
        emitSnapshot();
      }
    },
    dispose() {
      cancelled = true;
      destroyCurrent();
      discardDotLottieWcScript();
    },
  };
}
