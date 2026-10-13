/**
 * 范例：同屏实例数对每帧开销的影响——同一份数据、同一 canvas 渲染器，只动实例数一个轴。
 * 前置状态：动画数据是同目录的 performance.json（30fps、60 帧、两个形状图层）；
 *           每个实例各自解析一份数据，多实例互不影响。
 * 主要操作：拖动「同屏实例数」滑杆（1–8），舞台按需创建 / 销毁实例，不足的槽位显示虚线占位。
 * 预期结果：读数三行——实例数、最近 60 帧的平均每帧耗时（rAF 回调间 performance.now
 *           差值的滑动平均）、单帧超过 25ms 的掉帧累计；每帧计算量随实例数线性增长，
 *           读数变化幅度取决于设备与素材复杂度，仅供相对比较。
 * 阅读主线：注入 CDN 脚本并取回动画数据 → 按滑杆增删实例（destroy 清理）→
 *           rAF 测量循环记录帧间隔（离屏或标签页隐藏时自动暂停）→ dispose 释放全部实例。
 */
import { createRenderLoop } from '../../assets/canvas-runtime.js';

// —— lottie-web 通过 CDN 的 script 标签引入，加载完成后暴露全局对象 lottie ——

interface LottieAnimationInstance {
  destroy(): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    container: HTMLElement;
    renderer: 'canvas';
    rendererSettings?: { dpr?: number };
    loop: boolean;
    autoplay: boolean;
    animationData: object;
  }): LottieAnimationInstance;
}

declare global {
  interface Window {
    lottie?: LottieGlobal;
  }
}

const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';
const ANIMATION_URL = new URL('./performance.json', import.meta.url).href;

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
      () => reject(new Error('lottie-web 脚本加载失败，请检查网络连接。')),
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

function fetchAnimationData(): Promise<string> {
  return fetch(ANIMATION_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`动画数据请求失败：${response.status}`);
    }
    return response.text();
  });
}

// —— 帧间隔统计 ——

const SLOT_COUNT = 8;          // 舞台槽位总数，与 Controls 滑杆范围一致
const FRAME_WINDOW = 60;       // 平均窗口：最近 60 帧
const DROP_THRESHOLD_MS = 25;  // 60Hz 帧间隔约 16.7ms，单帧超过约 1.5 倍记一次掉帧

export interface PerformanceOptions {
  instances: number;
}

export interface PerformanceSnapshot {
  instances: number;
  avgFrameMs: number;
  droppedFrames: number;
}

export interface PerformanceInstance {
  update(options: PerformanceOptions): void;
  dispose(): void;
}

export function createPerformance(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PerformanceSnapshot) => void,
): PerformanceInstance {
  // 共享外壳提供的是 <canvas>，隐藏它，用普通 div 网格承载多个动画实例。
  canvas.style.display = 'none';
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }

  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '10px',
    padding: '14px',
 );

  const hint = document.createElement('p');
  hint.textContent = 'canvas 渲染器 · 每格一个独立实例';
  Object.assign(hint.style, {
    position: 'absolute',
    top: '6px',
    right: '12px',
    margin: '0',
    fontSize: '12px',
    color: '#64748b',
 );
  wrapper.append(hint);

  // 预建 8 个槽位：实例不足时槽位退回虚线占位，舞台布局不跳动。
  const slots = Array.from({ length: SLOT_COUNT }, () => {
    const host = document.createElement('div');
    Object.assign(host.style, {
      position: 'relative',
      border: '1px dashed #cbd5e1',
      borderRadius: '6px',
   );
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      inset: '0',
   );
    host.append(container);
    wrapper.append(host);
    return {
      host,
      container,
      animation: undefined as LottieAnimationInstance | undefined,
    };
  });

  stage.insertBefore(wrapper, canvas);

  let targetCount = 1;
  let activeCount = 0;
  let lottieRef: LottieGlobal | undefined;
  let dataText: string | undefined;
  let cancelled = false;

  const frameWindow: number[] = [];
  let droppedFrames = 0;

  function currentAverage(): number {
    if (frameWindow.length === 0) {
      return 0;
    }
    const total = frameWindow.reduce((sum, value) => sum + value, 0);
    return total / frameWindow.length;
  }

  // 测量循环用共享外壳的 createRenderLoop：滚动远离视口或标签页隐藏时自动停止，
  // 恢复可见后继续——这个行为本身就是「离屏暂停」策略的现场示范。
  const loop = createRenderLoop(wrapper, (deltaSeconds) => {
    const deltaMs = deltaSeconds * 1000;
    // 首帧（delta 为 0）或从后台恢复的巨大间隔不进统计，避免污染平均值。
    if (deltaMs <= 0 || deltaMs > 1000) {
      return;
    }
    frameWindow.push(deltaMs);
    if (frameWindow.length > FRAME_WINDOW) {
      frameWindow.shift();
    }
    if (deltaMs > DROP_THRESHOLD_MS) {
      droppedFrames += 1;
    }
    emit({
      instances: activeCount,
      avgFrameMs: currentAverage(),
      droppedFrames,
    });
  });

  function sync(lottie: LottieGlobal, text: string) {
    slots.forEach((slot, index) => {
      const wanted = index < targetCount;
      if (wanted && !slot.animation) {
        // 每个实例各解析一份动画数据：同一份数据多次装配时互不影响
        // （README 要求含 repeater 的动画多次 loadAnimation 前必须深拷贝）。
        slot.animation = lottie.loadAnimation({
          container: slot.container,
          renderer: 'canvas',
          rendererSettings: {
            dpr: Math.min(window.devicePixelRatio || 1, 2),
          },
          loop: true,
          autoplay: true,
          animationData: JSON.parse(text),
        });
        slot.host.style.borderStyle = 'solid';
        slot.host.style.borderColor = '#94a3b8';
      } else if (!wanted && slot.animation) {
        // 缩减实例数即销毁：destroy() 释放画布与实例内部状态。
        slot.animation.destroy();
        slot.animation = undefined;
        slot.host.style.borderStyle = 'dashed';
        slot.host.style.borderColor = '#cbd5e1';
      }
    });
    activeCount = targetCount;
    emit({
      instances: activeCount,
      avgFrameMs: currentAverage(),
      droppedFrames,
    });
  }

  Promise.all([loadLottie(), fetchAnimationData()])
    .then(([lottie, text]) => {
      if (cancelled) {
        return;
      }
      lottieRef = lottie;
      dataText = text;
      sync(lottie, text);
    })
    .catch(() => {
      // 数据或脚本不可用时保持占位舞台，读数归零即可定位到加载失败。
      if (!cancelled) {
        emit({ instances: 0, avgFrameMs: 0, droppedFrames: 0 });
      }
    });

  return {
    update(options) {
      const count = Math.max(1, Math.min(SLOT_COUNT, Math.round(options.instances)));
      if (count === targetCount) {
        return;
      }
      targetCount = count;
      const lottie = lottieRef;
      const text = dataText;
      if (lottie && text) {
        sync(lottie, text);
      }
    },
    dispose() {
      cancelled = true;
      loop.dispose();
      slots.forEach((slot) => {
        if (slot.animation) {
          slot.animation.destroy();
          slot.animation = undefined;
        }
      });
      activeCount = 0;
      wrapper.remove();
      discardLottieScript();
    },
  };
}
