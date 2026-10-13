/**
 * 范例：同一份动画数据在同一页面创建 1–4 个实例，并验证 destroy() 的清理效果。
 *
 * - 前置：lottie-web 通过 CDN script 注入；data.json 与本文件同目录，以 ?raw
 *   导入为文本，创建实例时 JSON.parse 得到每个实例独立的数据对象。
 * - 操作：Controls 拖动「同屏实例数」滑杆（1–4），范例先 destroy 全部现有
 *   实例，再按新数量重建；每个实例独占一个容器 div，由 svg 渲染器填充。
 * - 预期：「当前实例数」与容器中 lottie 生成的 svg 渲染节点同步增减；把数量
 *   调小后，「最近一次销毁残留」为 0——destroy 把自己渲染的 svg 移出 DOM。
 * - 阅读主线：rebuild() 的「先销毁全部旧实例、再创建新实例」节奏，以及每个
 *   实例独立数据对象的写法（共享同一对象时改动会互相影响，见正文）。
 */
import dataText from './data.json?raw';

export interface ExampleArgs {
  count: number;
}

export interface ExampleSnapshot {
  /** Controls 请求的同屏实例数。 */
  count: number;
  /** 当前存活的动画实例数。 */
  instances: number;
  /** 实例行容器中 lottie 生成的 svg 渲染节点数。 */
  svgNodes: number;
  /** 最近一次销毁的实例中仍残留在 DOM 里的节点数；尚未销毁过为 null。 */
  leftover: number | null;
}

export interface ExampleInstance {
  update(args: ExampleArgs): void;
  dispose(): void;
}

interface LottieAnimationItem {
  destroy(): void;
}

interface LottieGlobal {
  loadAnimation(params: {
    container: HTMLElement;
    renderer: string;
    loop: boolean;
    autoplay: boolean;
    name: string;
    animationData: unknown;
  }): LottieAnimationItem;
}

interface TrackedAnimation {
  animation: LottieAnimationItem;
  wrapper: HTMLDivElement;
}

const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';

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
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少容器元素。');
  }
  // 本例统计 lottie 生成的 DOM 节点，用 svg 渲染器呈现，画布只占位
  canvas.style.display = 'none';

  // 实例行容器：绝对定位铺满舞台上部，给左下角读数区留出空间
  const row = document.createElement('div');
  row.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'right:0',
    'bottom:56px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'gap:18px',
  ].join(';');
  stage.appendChild(row);

  let currentCount = 0;
  let runId = 0;
  let disposed = false;
  let animations: TrackedAnimation[] = [];
  // 销毁前收集被销毁实例的 svg 引用，用于统计「残留节点数」读数
  let leftoverSvgs: SVGElement[] = [];

  function makeWrapper(index: number): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.title = `实例 instance-${index}`;
    wrapper.style.cssText =
      'width:104px;height:104px;border:1px solid #dbe3f0;border-radius:8px;background:#fff;';
    return wrapper;
  }

  function emitSnapshot() {
    emit({
      count: currentCount,
      instances: animations.length,
      svgNodes: row.querySelectorAll('svg').length,
      leftover:
        leftoverSvgs.length > 0
          ? leftoverSvgs.filter((svg) => svg.isConnected).length
          : null,
    });
  }

  async function rebuild(count: number) {
    const run = ++runId;

    // 销毁节奏：先收集旧实例的 svg 引用，再逐个 destroy，最后移除容器
    leftoverSvgs = animations
      .map(({ wrapper }) => wrapper.querySelector('svg'))
      .filter((svg): svg is SVGElement => svg !== null);
    animations.forEach(({ animation }) => animation.destroy());
    animations.forEach(({ wrapper }) => wrapper.remove());
    animations = [];

    currentCount = count;
    // 销毁后立刻读数：leftover 应为 0，证明 destroy 清理了自己渲染的节点
    emitSnapshot();

    let lottie: LottieGlobal;
    try {
      lottie = await loadLottie();
    } catch {
      return;
    }
    if (disposed || run !== runId) {
      return;
    }

    for (let index = 0; index < count; index += 1) {
      const wrapper = makeWrapper(index);
      row.appendChild(wrapper);
      // 每个实例独立 JSON.parse 一份数据对象：实例之间不共享数据引用，
      // 改动某个实例的 animationData 不会影响其他实例
      const animation = lottie.loadAnimation({
        container: wrapper,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        name: `instance-${index}`,
        animationData: JSON.parse(dataText),
      });
      animations.push({ animation, wrapper });
    }
    emitSnapshot();
  }

  emitSnapshot();

  return {
    update(args) {
      if (args.count !== currentCount) {
        void rebuild(args.count);
      }
    },
    dispose() {
      disposed = true;
      animations.forEach(({ animation }) => animation.destroy());
      animations = [];
      row.remove();
    },
  };
}
