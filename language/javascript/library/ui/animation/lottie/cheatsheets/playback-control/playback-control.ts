/**
 * 范例：AnimationItem 播放控制控制台——帧指针、速度、方向三个状态量如何被控制方法拨动。
 * 前置状态：动画数据来自同目录的 playback-control.json（30fps、120 帧、常速约 4 秒），
 *           蓝色圆点从左上移向右下，第 60 帧恰好压在舞台中央的竖线上，尺寸随时间脉动；
 *           实例固定 loop + autoplay，之后的播停全靠控制方法接管。
 * 主要操作：Controls 提供动作 select（play / pause / stop / goToAndPlay 中点）、速度滑杆
 *           （0.25–3）、方向 select（1 / -1）、目标帧滑杆（0–120）加 isFrame 按帧开关；
 *           每个控件只在实际变化时调用一次对应方法，与读数变化一一对应。
 * 预期结果：stop 后 play 从起点重播，pause 停在当前帧；goToAndPlay(60, true) 圆点压线继续播；
 *           按毫秒模式（isFrame 关）的落点 = 毫秒 × 帧率 ÷ 1000 × 速度 × 方向——速度 3、
 *           目标 60 时落点为 180、画面停在最末帧姿态且读数如实显示 180，方向 -1 时落点为负、
 *           画面停在起点画面。
 * 阅读主线：按需注入 CDN 脚本 → loadAnimation 创建循环实例 → 比对各控件、调用对应控制方法 →
 *           enterFrame 与实例属性（currentFrame / playSpeed / playDirection / isPaused）驱动读数
 *           → dispose 时 destroy。
 */

// 文档页经打包器加载同目录动画数据：?raw 以文本形式引入再解析。
// 每次解析都得到全新对象，避免多个实例共享被 loadAnimation 改写过的数据。
import animationDataText from './playback-control.json?raw';

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

// 本课用到的 AnimationItem 成员：currentFrame / playSpeed / playDirection / isPaused
// 是驱动读数的三个状态量加播放开关，方法即正文讲的控制 API。
interface LottieAnimationInstance {
  currentFrame: number;
  isPaused: boolean;
  playSpeed: number;
  playDirection: number;
  play(): void;
  pause(): void;
  stop(): void;
  goToAndStop(value: number, isFrame?: boolean): void;
  goToAndPlay(value: number, isFrame?: boolean): void;
  setSpeed(speed: number): void;
  setDirection(direction: number): void;
  destroy(): void;
  addEventListener(name: string, callback: (event?: unknown) => void): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    container: HTMLElement;
    renderer: 'svg';
    loop: boolean;
    autoplay: boolean;
    animationData: Record<string, unknown>;
  }): LottieAnimationInstance;
}

declare global {
  interface Window {
    lottie?: LottieGlobal;
  }
}

export interface PlaybackControlOptions {
  action: 'play' | 'pause' | 'stop' | 'gotoMid';
  speed: number;
  direction: number;
  targetFrame: number;
  isFrame: boolean;
}

export interface PlaybackControlSnapshot {
  frame: number;
  speed: number;
  direction: number;
  status: string;
}

export interface PlaybackControlInstance {
  update(options: PlaybackControlOptions): void;
  dispose(): void;
}

// 与 playback-control.json 的 fr / op 保持一致：30fps、120 帧，中点在第 60 帧。
const FRAME_RATE = 30;
const MID_FRAME = 60;

// 控件基线：实例创建后每个控件只在实际变化时触发一次调用。
const INITIAL_OPTIONS: PlaybackControlOptions = {
  action: 'play',
  speed: 1,
  direction: 1,
  targetFrame: MID_FRAME,
  isFrame: false,
};

export function createPlaybackControl(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PlaybackControlSnapshot) => void,
): PlaybackControlInstance {
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
  let cancelled = false;
  let current: PlaybackControlOptions = { ...INITIAL_OPTIONS };

  // 读数直接取实例上的状态量：currentFrame 取整数帧，
  // playSpeed / playDirection 是 setSpeed / setDirection 的实际生效值。
  function emitSnapshot() {
    if (!animation) {
      return;
    }
    emit({
      frame: Math.floor(animation.currentFrame),
      speed: animation.playSpeed,
      direction: animation.playDirection,
      status: animation.isPaused ? '已暂停' : '播放中',
    });
  }

  // 目标帧滑杆以「帧」为刻度：按帧模式直接传帧号；
  // 按毫秒模式（API 默认）先把帧号换成毫秒，再交给 goToAndStop
  // 按内部规则（毫秒 × 帧率 ÷ 1000 × 速度 × 方向）换算落点。
  function jumpToTarget(options: PlaybackControlOptions) {
    if (!animation) {
      return;
    }
    if (options.isFrame) {
      animation.goToAndStop(options.targetFrame, true);
    } else {
      animation.goToAndStop((options.targetFrame / FRAME_RATE) * 1000, false);
    }
  }

  // 每个控件的变化对应一次真实的 API 调用，调用顺序无关——
  // 前一个控件改写的状态（速度、方向、播放状态）自然影响下一个控件的结果。
  function applyDiff(
    prev: PlaybackControlOptions,
    next: PlaybackControlOptions,
  ) {
    if (!animation) {
      return;
    }

    if (next.speed !== prev.speed) {
      animation.setSpeed(next.speed);
    }
    if (next.direction !== prev.direction) {
      animation.setDirection(next.direction);
    }
    if (next.targetFrame !== prev.targetFrame || next.isFrame !== prev.isFrame) {
      jumpToTarget(next);
    }
    if (next.action !== prev.action) {
      switch (next.action) {
        case 'play':
          animation.play();
          break;
        case 'pause':
          animation.pause();
          break;
        case 'stop':
          animation.stop();
          break;
        case 'gotoMid':
          animation.goToAndPlay(MID_FRAME, true);
          break;
      }
    }

    emitSnapshot();
  }

  function destroyCurrent() {
    animation?.destroy();
    animation = undefined;
  }

  function load() {
    loadLottie()
      .then((lottie) => {
        if (cancelled) {
          return;
        }

        // loop / autoplay 是创建参数，控制台固定「循环 + 自动播放」；
        // 数据用内联 animationData（本课只关心实例上的控制方法，与数据来源无关）。
        animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: JSON.parse(animationDataText) as Record<
            string,
            unknown
          >,
        });

        animation.addEventListener('enterFrame', emitSnapshot);
        // 数据就绪后补上加载期间读者已调整过的速度与方向
        // （动作与跳转是一次性事件，不适合补发）。
        animation.addEventListener('DOMLoaded', () => {
          if (cancelled || !animation) {
            return;
          }
          if (current.speed !== INITIAL_OPTIONS.speed) {
            animation.setSpeed(current.speed);
          }
          if (current.direction !== INITIAL_OPTIONS.direction) {
            animation.setDirection(current.direction);
          }
          emitSnapshot();
        });
      })
      .catch(() => {
        if (!cancelled) {
          destroyCurrent();
        }
      });
  }

  load();

  return {
    update(next) {
      const prev = current;
      current = next;
      // 数据未就绪时只记录最新控件值，DOMLoaded 后补上速度与方向。
      if (animation) {
        applyDiff(prev, next);
      }
    },
    dispose() {
      cancelled = true;
      destroyCurrent();
      discardLottieScript();
    },
  };
}
