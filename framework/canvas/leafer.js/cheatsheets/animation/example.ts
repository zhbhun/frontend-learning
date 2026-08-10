/**
 * 演示内容：@leafer-in/animate 的关键帧动画——animate(keyframe, options) 的写法、
 *           动画曲线 easing、循环 / 往返排队控制，以及 play / pause / 事件驱动的进度读数。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           顶部副作用导入 @leafer-in/animate 不可省：它在 UI 原型上注册 animate / killAnimate
 *           方法、注册 transition 属性，并把 set(data, transition) 接到动画。
 *           本课公开输入：duration（时长，秒）、easing（缓动曲线名）、repeat（once 播一次 /
 *           loop 无限循环 / swing 无限往返）、running（播放 / 暂停）。
 * 主要操作：new Leafer({ view: canvas }) 复用传入 <canvas>；画一条水平轨道 + 一个圆角矩形滑块
 *           （around:'center' 使 x 为中心点且为旋转 / 缩放支点）。
 *           用 node.animate({ x, rotation }, { duration, easing, autoplay, ...repeat }) 建单关键帧动画：
 *           单关键帧时引擎自动以「节点当前状态」为 from、关键帧样式为 to，做 from → to 插值。
 *           update 在 duration/easing/repeat 变化时 killAnimate + set 回起点 + 重建动画；
 *           running 单独变化时只调 play / pause（completed 后再播放则重建以从头重放）。
 *           读数由动画事件驱动：UPDATE / PLAY / PAUSE / COMPLETED 每次触发都重算进度 / 状态 / 循环次数，
 *           动画自身跑在 Leafer 的 requestRender 上，页面隐藏时随 rAF 节流自动趋停，无需额外轮询。
 * 预期结果：滑块从左端到右端旋转一圈；切换 easing → 运动节奏明显不同（back-out 回弹、bounce-out 弹跳、
 *           elastic-out 抖动）；切换 repeat=loop → 到端点立刻重来、循环次数累加；repeat=swing → 到端点反向回走；
 *           running 关 → 停在当前进度、状态=已暂停；running 开 → 继续（once 完成后再开则从头重放）。
 * 阅读主线：createAnimation → 建舞台 / 轨道 / 滑块 → build 用 animate 建动画并 attach 事件 →
 *           pollReadout 派发读数 → update 分流「重建 vs 播放暂停」→ dispose 销毁 leafer 与 observer。
 */
import { AnimateEvent } from '@leafer-in/animate';
import { Leafer, Rect, Text, type IAnimate } from 'leafer-ui';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 缓动名取自 IAnimateEasingName 的常用子集（见正文开场参考表与曲线小节）。
export type AnimationEasing =
  | 'ease'
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'back-out'
  | 'bounce-out'
  | 'elastic-out';

export type AnimationRepeat = 'once' | 'loop' | 'swing';

export interface AnimationOptions {
  /** 单段动画时长（秒），对应 IAnimateOptions.duration。 */
  duration: number;
  /** 缓动曲线，对应 IAnimateOptions.easing。 */
  easing: AnimationEasing;
  /** 排队方式：once 播一次 / loop 无限循环 / swing 无限往返。 */
  repeat: AnimationRepeat;
  /** 播放（true）或暂停（false）。 */
  running: boolean;
}

export interface AnimationSnapshot {
  /** 当前进度（time / duration）。 */
  progress: string;
  /** 运行状态：运行中 / 已暂停 / 已完成。 */
  state: string;
  /** 已循环次数（animate.looped）。 */
  loop: string;
  /** 动画总时长（秒）。 */
  duration: string;
}

export interface AnimationInstance {
  update(options: AnimationOptions): void;
  dispose(): void;
}

// repeat → IAnimateOptions 的 loop / swing 映射：
// once：loop=false 且 swing=false，播完一次即 complete；
// loop：loop=true，到端点立刻从头再来（无限）；
// swing：swing=true，到端点反向回走（无限往返）。
const REPEAT_CONFIG: Record<AnimationRepeat, { loop?: boolean; swing?: boolean }> = {
  once: { loop: false, swing: false },
  loop: { loop: true },
  swing: { swing: true },
};

export function createAnimation(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AnimationSnapshot) => void,
): AnimationInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  const title = new Text({
    text: '调整时长 / 曲线 / 循环，观察滑块运动节奏与下方进度读数',
    fontSize: 15,
    fontWeight: 600,
    fill: '#475569',
    hittable: false,
  });
  leafer.add(title);

  const hint = new Text({
    text: 'node.animate(keyframe, options) · 单关键帧自动以当前状态为 from',
    fontSize: 12,
    fill: '#94a3b8',
    hittable: false,
  });
  leafer.add(hint);

  // 轨道：一条灰色细矩形；滑块沿其水平移动。
  const track = new Rect({
    y: 0,
    height: 6,
    fill: '#e2e8f0',
    cornerRadius: 3,
    hittable: false,
  });
  leafer.add(track);

  // 滑块：圆角矩形。around:'center' 让 x 表示中心点，同时作为旋转支点。
  const slider = new Rect({
    width: 60,
    height: 60,
    fill: '#6366f1',
    cornerRadius: 16,
    around: 'center',
    hittable: false,
    shadow: {
      x: 0,
      y: 6,
      blur: 14,
      color: 'rgba(99,102,241,0.35)',
    },
  });
  leafer.add(slider);

  // 布局状态：resize 时重算，build 用其确定起止 x。
  const layout = { startX: 60, endX: 200, centerY: 200 };
  let current: AnimationOptions | null = null;

  function relayout() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });

    const padding = 60;
    const trackY = size.height * 0.54;
    layout.startX = padding;
    layout.endX = Math.max(padding + 1, size.width - padding);
    layout.centerY = trackY;

    title.set({ x: 24, y: 20 });
    hint.set({ x: 24, y: size.height - 28 });

    track.set({ x: layout.startX, y: trackY - 3, width: layout.endX - layout.startX });

    // 尺寸变了，端点也变：用当前参数重建动画，让起止位置匹配新画布。
    if (current) {
      build(current);
    } else {
      slider.set({ x: layout.startX, y: trackY, rotation: 0 });
    }
  }

  function pollReadout() {
    const a = slider.animate() as IAnimate | undefined;
    if (!a || (a as unknown as { destroyed?: boolean }).destroyed) {
      emit({ progress: '—', state: '—', loop: '—', duration: '—' });
      return;
    }
    const dur = a.duration ?? 0;
    const time = a.time ?? 0;
    const ratio = dur > 0 ? Math.min(1, Math.max(0, time / dur)) : 0;
    const destroyedFlag = (a as unknown as { destroyed?: boolean }).destroyed;
    const stateText = destroyedFlag
      ? '已销毁'
      : a.completed
        ? '已完成'
        : a.running
          ? '运行中'
          : '已暂停';
    emit({
      progress: `${Math.round(ratio * 100)}%`,
      state: stateText,
      loop: a.looped ? String(a.looped) : '0',
      duration: `${dur.toFixed(2)}s`,
    });
  }

  function attach(a: IAnimate) {
    // 读数完全由动画事件驱动：动画在跑才有 UPDATE，暂停 / 完成各发一次状态事件。
    a.on(AnimateEvent.UPDATE, pollReadout);
    a.on(AnimateEvent.PLAY, pollReadout);
    a.on(AnimateEvent.PAUSE, pollReadout);
    a.on(AnimateEvent.STOP, pollReadout);
    a.on(AnimateEvent.COMPLETED, pollReadout);
    a.on(AnimateEvent.SEEK, pollReadout);
  }

  function build(options: AnimationOptions) {
    // killAnimate 会销毁旧动画并把 node.__animate 置空，避免下次 animate() 把新旧排成队列。
    slider.killAnimate();
    // 单关键帧以「当前状态」为 from：先把滑块拉回起点，保证每次都从左端出发。
    slider.set({ x: layout.startX, y: layout.centerY, rotation: 0 });

    const a = slider.animate(
      // 关键帧 = 目标样式（to）。引擎从 from（当前 x / rotation）插值到此。
      { x: layout.endX, rotation: 360 },
      {
        duration: options.duration,
        easing: options.easing,
        autoplay: options.running,
        ...REPEAT_CONFIG[options.repeat],
      },
    );
    attach(a);
    pollReadout();
  }

  const resizeObserver = createResizeObserver(canvas, relayout);
  relayout();

  // 记录上次用于「是否需要重建」的结构键与 running，避免单纯播放 / 暂停也重建动画。
  let lastStructKey = '';
  let lastRunning = true;

  return {
    update(options) {
      current = options;
      const structKey = `${options.duration}|${options.easing}|${options.repeat}`;
      const existing = slider.animate() as IAnimate | undefined;
      const hasLive = !!existing && !(existing as unknown as { destroyed?: boolean }).destroyed;

      if (structKey !== lastStructKey || !hasLive) {
        // 时长 / 曲线 / 循环变化，或当前没有可复用的动画：从起点重建。
        lastStructKey = structKey;
        lastRunning = options.running;
        build(options);
        return;
      }

      if (options.running !== lastRunning) {
        lastRunning = options.running;
        if (options.running) {
          // once 模式播完后 completed=true，再按播放应从头重放，而非无操作。
          if (existing.completed) {
            build(options);
          } else {
            existing.play();
          }
        } else {
          existing.pause();
        }
      }
      pollReadout();
    },
    dispose() {
      slider.killAnimate();
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
