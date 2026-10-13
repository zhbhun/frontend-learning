/**
 * 范例：滚动控制台——外部输入（自制滚动条 / 进度滑杆）经映射公式驱动帧指针。
 * 前置状态：动画数据来自同目录的 interactivity.json（30fps、ip=0、op=120，共 120 帧），
 *           圆点沿轨道单向行进（线性，第 0→120 帧），颜色随全片推进从蓝渐变到橙，
 *           中段在第 60 帧放大到峰值；实例以 loop: false、autoplay: false 创建——
 *           画面完全由输入决定，实例停在输入对应的帧等待下一次输入。
 * 主要操作：画面右侧有一条自制滚动条（Canvas 绘制，可拖动、可点击跳转），模拟页面滚动；
 *           Controls 提供「滚动进度」滑杆（与滚动条写同一个进度状态）、「映射模式」select
 *           （全片 seek / segment 内 seek）与 segment 起点/终点滑杆（playSegments 的 start/end）。
 * 预期结果：输入百分比 → frame = 比例 × 区间帧数 → goToAndStop；segment 激活时绝对帧先减
 *           firstFrame（2.4 结论）；「映射帧」与「当前帧」读数始终一致。
 * 阅读主线：按需注入 CDN 脚本 → loadAnimation 创建暂停实例 → update 把控件与拖动变化
 *           翻译成 playSegments / resetSegments / goToAndStop → enterFrame 驱动滚动条
 *           绘制与读数 → dispose 时 destroy。
 */

// 共享外壳提供离屏感知的尺寸观察：画布尺寸变化时重绘滚动条。
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 文档页经打包器加载同目录动画数据：?raw 以文本形式引入再解析。
// 每次解析都得到全新对象，避免多个实例共享被 loadAnimation 改写过的数据。
import animationDataText from './interactivity.json?raw';

// lottie-web 通过 CDN 的 script 标签引入，加载完成后暴露全局对象 lottie。
// 文档页的渲染环境没有现成的 script 节点，这里按需注入，等待 onload 后继续。
const LOTTIE_CDN = 'https://unpkg.com/lottie-web@5/build/player/lottie.min.js';

let pendingScript: HTMLScriptElement | undefined;

function loadLottie(): Promise<LottieGlobal> {
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

function discardLottieScript(): void {
  // 页面卸载时脚本可能仍在下载，此时移除注入节点；
  // 全局对象已就绪则无法也无需回收。
  if (!window.lottie && pendingScript) {
    pendingScript.remove();
    pendingScript = undefined;
  }
}

// 本课用到的 AnimationItem 成员：firstFrame / totalFrames 描述当前生效的映射区间，
// goToAndStop 拨动帧指针，playSegments / resetSegments 在两种映射模式间切换。
interface LottieAnimationInstance {
  currentFrame: number;
  firstFrame: number;
  totalFrames: number;
  goToAndStop(value: number, isFrame?: boolean): void;
  playSegments(segments: number[] | number[][], forceFlag?: boolean): void;
  resetSegments(forceFlag?: boolean): void;
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

export interface InteractivityOptions {
  /** 外部输入归一化后的百分比（0–100），来自 Controls 滑杆或画面内滚动条拖动。 */
  progress: number;
  /** 映射模式：全片 seek（比例 × totalFrames）或 segment 内 seek（比例映射到区间）。 */
  seekMode: 'full' | 'segment';
  /** segment 起点（绝对帧），仅 seekMode 为 segment 时生效。 */
  segStart: number;
  /** segment 终点（绝对帧），仅 seekMode 为 segment 时生效。 */
  segEnd: number;
}

export interface InteractivitySnapshot {
  progress: number;
  rangeStart: number;
  rangeEnd: number;
  /** 映射公式的输出（绝对帧）：goToAndStop 的目标落点。 */
  mappedFrame: number;
  /** 读自实例的当前绝对帧：currentFrame + firstFrame。 */
  frame: number;
}

export interface InteractivityInstance {
  update(options: InteractivityOptions): void;
  dispose(): void;
}

// 与 interactivity.json 的 ip / op 保持一致：全片时间轴 0–120 帧。
const TOTAL_FRAMES = 120;

// 自制滚动条的几何参数（CSS 像素）：右侧竖条 + 可拖动拇指。
const SCROLLBAR_WIDTH = 12;
const SCROLLBAR_MARGIN = 18;
const THUMB_RATIO = 0.3;
const THUMB_MIN = 36;

// 控件基线：与 stories 默认 args 一致。
const INITIAL_OPTIONS: InteractivityOptions = {
  progress: 30,
  seekMode: 'full',
  segStart: 20,
  segEnd: 80,
};

interface StageGeometry {
  width: number;
  height: number;
  trackX: number;
  trackY: number;
  trackWidth: number;
  trackHeight: number;
  thumbHeight: number;
  /** 拇指可移动的距离：轨道高 − 拇指高。 */
  travel: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createInteractivity(
  canvas: HTMLCanvasElement,
  emit: (snapshot: InteractivitySnapshot) => void,
): InteractivityInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 舞台中部留给 lottie 渲染的动画画面；滚动条由 Canvas 画在右缘。
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: '4%',
    left: '4%',
    right: '17%',
    bottom: '18%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  });
  stage.append(container);

  let animation: LottieAnimationInstance | undefined;
  let cancelled = false;

  // 内部状态：progress 同时接受 Controls 与滚动条拖动写入（见 update 的来源区分）。
  const state: InteractivityOptions = { ...INITIAL_OPTIONS };
  // 上一次从 args 读到的 progress：区分「Controls 改了进度」与「无关控件变化」。
  let lastArgsProgress = INITIAL_OPTIONS.progress;
  let dragging = false;

  // ---------- 映射与 seek ----------

  // 映射公式：frame = start + 比例 × 区间长度。区间读自实例——
  // segment 激活后 firstFrame / totalFrames 被改写，公式自动切换到段内坐标。
  function seek() {
    if (!animation) {
      return;
    }

    const start = animation.firstFrame;
    const length = Math.max(animation.totalFrames, 1);
    const ratio = clamp01(state.progress / 100);
    const frame = Math.round(start + ratio * length);

    // segment 激活时 goToAndStop 按段内相对帧解释，绝对帧先减 firstFrame（2.4 结论）；
    // goToAndStop 自带暂停——seek 驱动的实例保持暂停等待下一次输入。
    animation.goToAndStop(frame - start, true);
  }

  // 切换映射模式或调整区间边界时重激活区间。forceFlag=true 立即生效：
  // playSegments 会跳到段首并自动恢复播放，随后的 seek() 用 goToAndStop 同步
  // 接管帧指针并暂停——两次同步调用之间不会渲染出中间状态，读者看不到闪跳。
  function activateRange() {
    if (!animation) {
      return;
    }

    if (state.seekMode === 'segment') {
      // 起点越过终点时按较小/较大值生效；长度至少 1 帧，避免除零。
      const start = Math.min(state.segStart, state.segEnd);
      const end = Math.max(Math.max(state.segStart, state.segEnd), start + 1);
      animation.playSegments([start, end], true);
    } else if (
      animation.firstFrame !== 0 ||
      animation.totalFrames !== TOTAL_FRAMES
    ) {
      // 回到全片映射：仅在确实有 segment 生效时恢复 [ip, op] 并把指针拨回起点，
      // 落点交给随后的 seek()。
      animation.resetSegments(true);
    }
  }

  // 滚动条拖动 / 点击跳转的入口：只写内部进度，不回写 args——
  // 之后 Controls 的其他控件变化不会把拖动结果冲掉。
  function setProgress(next: number) {
    state.progress = clamp01(next / 100) * 100;
    seek();
    drawStage();
    emitSnapshot();
  }

  // ---------- 读数 ----------

  function emitSnapshot() {
    const ratio = clamp01(state.progress / 100);

    if (!animation) {
      emit({
        progress: Math.round(state.progress * 10) / 10,
        rangeStart: 0,
        rangeEnd: TOTAL_FRAMES,
        mappedFrame: Math.round(ratio * TOTAL_FRAMES),
        frame: 0,
      });
      return;
    }

    const start = animation.firstFrame;
    const end = start + animation.totalFrames;
    const length = Math.max(end - start, 1);

    emit({
      // 拖动中的百分比保留 1 位小数，读数不至于出现长尾小数。
      progress: Math.round(state.progress * 10) / 10,
      rangeStart: Math.round(start),
      rangeEnd: Math.round(end),
      mappedFrame: Math.round(start + ratio * length),
      // 实例当前绝对帧：段内相对帧 + firstFrame。
      frame: Math.round(animation.currentFrame + start),
    });
  }

  // ---------- 自制滚动条（模拟页面滚动） ----------

  function geometry(): StageGeometry {
    const size = readCanvasSize(canvas);
    const trackHeight = Math.max(1, size.height - SCROLLBAR_MARGIN * 2);
    const thumbHeight = Math.max(
      THUMB_MIN,
      Math.round(trackHeight * THUMB_RATIO),
    );

    return {
      width: size.width,
      height: size.height,
      trackX: size.width - SCROLLBAR_MARGIN - SCROLLBAR_WIDTH,
      trackY: SCROLLBAR_MARGIN,
      trackWidth: SCROLLBAR_WIDTH,
      trackHeight,
      thumbHeight,
      travel: Math.max(1, trackHeight - thumbHeight),
    };
  }

  function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, r);
    drawingContext.arcTo(x + w, y + h, x, y + h, r);
    drawingContext.arcTo(x, y + h, x, y, r);
    drawingContext.arcTo(x, y, x + w, y, r);
    drawingContext.closePath();
  }

  function drawStage() {
    const geo = geometry();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(geo.width * pixelRatio);
    const pixelHeight = Math.round(geo.height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, geo.width, geo.height);

    // 轨道。
    drawingContext.fillStyle = '#e2e8f0';
    roundedRectPath(geo.trackX, geo.trackY, geo.trackWidth, geo.trackHeight, 6);
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();

    // 拇指：位置 = 比例 × 可移动距离，与 seek 用同一个进度状态。
    const ratio = clamp01(state.progress / 100);
    const thumbY = geo.trackY + ratio * geo.travel;
    drawingContext.fillStyle = '#4f7cff';
    roundedRectPath(geo.trackX, thumbY, geo.trackWidth, geo.thumbHeight, 6);
    drawingContext.fill();

    // 百分比标签跟在拇指旁边。
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.textAlign = 'right';
    drawingContext.fillText(
      `${Math.round(state.progress)}%`,
      geo.trackX - 8,
      thumbY + geo.thumbHeight / 2 + 4,
    );
    drawingContext.textAlign = 'left';
  }

  // 指针事件把拖动换算回归一化比例：与正文公式同向——先归一化，再交给 seek。
  function ratioFromPointer(event: PointerEvent): number {
    const rect = canvas.getBoundingClientRect();
    const geo = geometry();
    const y = event.clientY - rect.top - geo.trackY - geo.thumbHeight / 2;

    return clamp01(y / geo.travel);
  }

  function inScrollbar(event: PointerEvent): boolean {
    const rect = canvas.getBoundingClientRect();
    const geo = geometry();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return (
      x >= geo.trackX - 16 &&
      x <= geo.trackX + geo.trackWidth + 16 &&
      y >= geo.trackY - 10 &&
      y <= geo.trackY + geo.trackHeight + 10
    );
  }

  function onPointerDown(event: PointerEvent) {
    if (!inScrollbar(event)) {
      return;
    }

    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    setProgress(ratioFromPointer(event) * 100);
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging) {
      setProgress(ratioFromPointer(event) * 100);
      return;
    }

    canvas.style.cursor = inScrollbar(event) ? 'grab' : 'default';
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) {
      return;
    }

    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    canvas.style.cursor = 'grab';
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // ---------- 生命周期 ----------

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

        // loop / autoplay 都是 false：seek 驱动的实例不自己动，
        // 画面完全由输入（滚动条 / Controls）决定。
        animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: JSON.parse(animationDataText) as Record<
            string,
            unknown
          >,
        });

        // 每一帧：重绘滚动条 + 刷新读数（goToAndStop 同步跳帧也会触发 enterFrame）。
        animation.addEventListener('enterFrame', () => {
          drawStage();
          emitSnapshot();
        });
        animation.addEventListener('DOMLoaded', () => {
          if (cancelled || !animation) {
            return;
          }

          // 数据就绪后才做首次 seek：此前帧指针会被加载流程重置（常见问题条目）。
          // 补上加载期间读者已调整过的输入（一次性把差异走完）。
          activateRange();
          seek();
          drawStage();
          emitSnapshot();
        });
      })
      .catch(() => {
        if (!cancelled) {
          destroyCurrent();
        }
      });
  }

  const resizeObserver = createResizeObserver(canvas, drawStage);

  load();
  drawStage();
  emitSnapshot();

  return {
    update(next) {
      // 区间相关字段只来自 Controls：与内部状态比对即可判断是否变化。
      const rangeChanged =
        next.seekMode !== state.seekMode ||
        next.segStart !== state.segStart ||
        next.segEnd !== state.segEnd;

      // progress 有两个来源：Controls 滑杆改 args.progress（与上次读到的 args 值
      // 比较得出变化），滚动条拖动只写内部 state。后到的无关控件变化不会把拖动冲掉。
      const progressChanged = next.progress !== lastArgsProgress;
      lastArgsProgress = next.progress;

      state.seekMode = next.seekMode;
      state.segStart = next.segStart;
      state.segEnd = next.segEnd;
      if (progressChanged) {
        state.progress = next.progress;
      }

      if (!animation) {
        return;
      }

      if (rangeChanged) {
        activateRange();
      }
      if (rangeChanged || progressChanged) {
        seek();
        drawStage();
        emitSnapshot();
      }
    },
    dispose() {
      cancelled = true;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      resizeObserver.disconnect();
      destroyCurrent();
      discardLottieScript();
    },
  };
}
