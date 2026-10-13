/**
 * 范例：时间轴控制台——playSegments 划定播放区间、goToAndStop 把外部输入映射到帧指针。
 * 前置状态：动画数据来自同目录的 frames-segments.json（30fps、ip=0、op=120，共 120 帧 4 秒），
 *           蓝橙圆点在轨道上往返：0–60 帧向右、60–120 帧向左，颜色随全片从蓝渐变到橙；
 *           实例固定 loop + autoplay，从全片 [0, 120] 开始循环。
 * 主要操作：Controls 提供 segment 起点/终点滑杆（playSegments 的 start/end）、立即生效开关
 *           （forceFlag）、循环开关（setLoop）、进度滑杆（goToAndStop 的原始入参，isFrame=true）；
 *           画面顶部用 Canvas 画出总时间轴——灰色全片、蓝色 segment 高亮、深色帧指针。
 * 预期结果：开 forceFlag 拖起点/终点立即跳段（totalFrames 读数变段长、动画只在区间内循环）；
 *           关 forceFlag 新段入队、当前循环走完在回卷点切换；关循环播到段尾 complete 暂停；
 *           拖进度滑杆指针跳到「入参 + firstFrame」并暂停，超出段长时画出区间外画面。
 * 阅读主线：按需注入 CDN 脚本 → loadAnimation 创建循环实例 → applyDiff 把控件变化翻译成
 *           setLoop / playSegments / goToAndStop 调用 → enterFrame 驱动时间轴绘制与读数 →
 *           dispose 时 destroy。
 */

// 共享外壳提供离屏感知的尺寸观察：画布尺寸变化时重绘时间轴。
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 文档页经打包器加载同目录动画数据：?raw 以文本形式引入再解析。
// 每次解析都得到全新对象，避免多个实例共享被 loadAnimation 改写过的数据。
import animationDataText from './frames-segments.json?raw';

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

// 本课用到的 AnimationItem 成员：totalFrames / firstFrame / currentFrame 是本课主角——
// playSegments 改写前两者，goToAndStop 拨动最后者；渲染画面 = currentFrame + firstFrame。
interface LottieAnimationInstance {
  currentFrame: number;
  firstFrame: number;
  totalFrames: number;
  isPaused: boolean;
  play(): void;
  goToAndStop(value: number, isFrame?: boolean): void;
  playSegments(segments: number[] | number[][], forceFlag?: boolean): void;
  setLoop(loop: boolean): void;
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

export interface FramesSegmentsOptions {
  segStart: number;
  segEnd: number;
  forceFlag: boolean;
  loop: boolean;
  progress: number;
}

export interface FramesSegmentsSnapshot {
  frame: number;
  segStart: number;
  segEnd: number;
  totalFrames: number;
  status: string;
  loops: number;
}

export interface FramesSegmentsInstance {
  update(options: FramesSegmentsOptions): void;
  dispose(): void;
}

// 与 frames-segments.json 的 ip / op 保持一致：总时间轴 0–120 帧。
const TOTAL_FRAMES = 120;

// 控件基线：与 stories 默认 args 一致，实例创建后每个控件只在实际变化时触发调用。
const INITIAL_OPTIONS: FramesSegmentsOptions = {
  segStart: 0,
  segEnd: TOTAL_FRAMES,
  forceFlag: true,
  loop: true,
  progress: 0,
};

export function createFramesSegments(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FramesSegmentsSnapshot) => void,
): FramesSegmentsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 舞台下半部留给 lottie 渲染的动画画面，上半部画总时间轴。
  const stage = canvas.parentElement;
  if (!stage) {
    throw new Error('范例舞台缺少宿主元素。');
  }
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: '27%',
    left: '0',
    right: '0',
    bottom: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 16px 12px',
  });
  stage.append(container);

  let animation: LottieAnimationInstance | undefined;
  let cancelled = false;
  let current: FramesSegmentsOptions = { ...INITIAL_OPTIONS };
  let loops = 0;
  let trailingTimer = 0;

  // 读数取自实例：firstFrame / totalFrames 是「当前生效」的区间——
  // forceFlag 关闭时滑杆已变、高亮未动，入队等待的差异当场可见。
  function emitSnapshot() {
    if (!animation) {
      return;
    }
    emit({
      frame: Math.floor(animation.currentFrame),
      segStart: Math.round(animation.firstFrame),
      segEnd: Math.round(animation.firstFrame + animation.totalFrames),
      totalFrames: Math.round(animation.totalFrames),
      status: animation.isPaused ? '已暂停' : '播放中',
      loops,
    });
  }

  // complete / segmentStart 这类终点事件可能落在读数节流窗口内被吞掉，
  // 追加一次兜底刷新，保证「已暂停」与区间切换可见。
  function emitSnapshotSoon() {
    emitSnapshot();
    window.clearTimeout(trailingTimer);
    trailingTimer = window.setTimeout(emitSnapshot, 150);
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

  function drawLegendItem(
    x: number,
    y: number,
    color: string,
    label: string,
  ): number {
    drawingContext.fillStyle = color;
    drawingContext.fillRect(x, y, 10, 10);
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.strokeRect(x + 0.5, y + 0.5, 9, 9);
    drawingContext.fillStyle = '#475569';
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 15, y + 9);
    return x + 15 + drawingContext.measureText(label).width + 18;
  }

  // 总时间轴：灰色全片 [ip, op]、蓝色 segment 高亮、深色帧指针。
  // 指针位置 = currentFrame + firstFrame（绝对帧）；超出段长时不钳制，
  // 指针画出高亮区之外——这正是 goToAndStop 越界的直观证据。
  function drawTimeline() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const segStart = animation ? animation.firstFrame : 0;
    const segLength = animation ? animation.totalFrames : TOTAL_FRAMES;
    const absFrame = animation
      ? animation.currentFrame + animation.firstFrame
      : 0;

    const margin = 28;
    const trackWidth = width - margin * 2;
    const trackY = 20;
    const trackHeight = 10;

    // 全片区间：ip 到 op 的灰色底条。
    drawingContext.fillStyle = '#e2e8f0';
    roundedRectPath(margin, trackY, trackWidth, trackHeight, 5);
    drawingContext.fill();
    drawingContext.strokeStyle = '#cbd5e1';
    drawingContext.stroke();

    // 生效中的 segment：蓝色高亮，宽度按段长占总帧数的比例。
    const segX = margin + (segStart / TOTAL_FRAMES) * trackWidth;
    const segWidth = (segLength / TOTAL_FRAMES) * trackWidth;
    drawingContext.fillStyle = '#4f7cff';
    roundedRectPath(segX, trackY, Math.max(segWidth, 4), trackHeight, 5);
    drawingContext.fill();

    // 帧指针：绝对帧超出总轴时按轴端裁剪绘制。
    const pointerRatio = Math.min(Math.max(absFrame, 0), TOTAL_FRAMES) / TOTAL_FRAMES;
    const pointerX = margin + pointerRatio * trackWidth;
    drawingContext.fillStyle = '#172033';
    drawingContext.fillRect(pointerX - 1.5, trackY - 6, 3, trackHeight + 14);
    drawingContext.beginPath();
    drawingContext.arc(pointerX, trackY - 9, 4, 0, Math.PI * 2);
    drawingContext.fill();

    // 图例：三种颜色的含义。
    let legendX = margin;
    legendX = drawLegendItem(legendX, 40, '#e2e8f0', '全片 ip–op');
    legendX = drawLegendItem(legendX, 40, '#4f7cff', 'segment');
    drawLegendItem(legendX, 40, '#172033', '帧指针');

    // 帧刻度。
    drawingContext.fillStyle = '#94a3b8';
    drawingContext.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.textAlign = 'center';
    drawingContext.fillText('0', margin + 6, 66);
    drawingContext.fillText('60', margin + trackWidth / 2, 66);
    drawingContext.fillText('120', margin + trackWidth - 8, 66);
    drawingContext.textAlign = 'left';
  }

  // 每个控件的变化对应一次真实的 API 调用，调用顺序无关——
  // 前一个控件改写的状态（区间、循环、播放状态）自然影响下一个控件的结果。
  function applyDiff(
    prev: FramesSegmentsOptions,
    next: FramesSegmentsOptions,
  ) {
    if (!animation) {
      return;
    }

    if (next.loop !== prev.loop) {
      // setLoop 是运行时方法，不必重建实例；loop=false 播完段尾后实例已暂停，
      // 切回循环时补一个 play()，下一 tick 从段尾回卷继续。
      animation.setLoop(next.loop);
      if (next.loop && animation.isPaused) {
        animation.play();
      }
    }

    if (
      next.segStart !== prev.segStart ||
      next.segEnd !== prev.segEnd ||
      next.forceFlag !== prev.forceFlag
    ) {
      // 起点越过终点时按较小/较大值生效，演示保持正序段（倒序段只在正文提及）。
      const start = Math.min(next.segStart, next.segEnd);
      const end = Math.max(next.segStart, next.segEnd);
      animation.playSegments([start, end], next.forceFlag);
    }

    if (next.progress !== prev.progress) {
      // 进度滑杆如实映射 goToAndStop 的原始入参：segment 激活时按段内相对帧
      // 解释，超出段长也不钳制——这两种行为都是要现场呈现的正文结论。
      animation.goToAndStop(next.progress, true);
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

        // loop / autoplay 是创建参数，控制台固定「循环 + 自动播放」，
        // 播放范围交给 playSegments 接管。
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

        // 每一帧：重绘时间轴 + 刷新读数（goToAndStop 等同步跳帧也会触发 enterFrame）。
        animation.addEventListener('enterFrame', () => {
          drawTimeline();
          emitSnapshot();
        });
        animation.addEventListener('loopComplete', () => {
          loops += 1;
          emitSnapshotSoon();
        });
        // segmentStart 随 adjustSegment 触发，播放器的循环计数同时在源码里清零
        // （playCount = 0），读数保持同一语义：切段即重新计轮。
        animation.addEventListener('segmentStart', () => {
          loops = 0;
          emitSnapshotSoon();
        });
        animation.addEventListener('complete', emitSnapshotSoon);
        animation.addEventListener('DOMLoaded', () => {
          if (cancelled || !animation) {
            return;
          }
          // 数据就绪后补上加载期间读者已调整过的控件（一次性把差异走完）。
          applyDiff(INITIAL_OPTIONS, current);
          drawTimeline();
          emitSnapshotSoon();
        });
      })
      .catch(() => {
        if (!cancelled) {
          destroyCurrent();
        }
      });
  }

  const resizeObserver = createResizeObserver(canvas, drawTimeline);

  load();

  return {
    update(next) {
      const prev = current;
      current = next;
      // 数据未就绪时只记录最新控件值，DOMLoaded 后统一补发。
      if (animation) {
        applyDiff(prev, next);
      }
    },
    dispose() {
      cancelled = true;
      window.clearTimeout(trailingTimer);
      resizeObserver.disconnect();
      destroyCurrent();
      discardLottieScript();
    },
  };
}
