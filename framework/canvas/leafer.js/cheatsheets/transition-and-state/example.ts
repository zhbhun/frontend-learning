/**
 * 演示内容：transition 过渡 + @leafer-in/state 交互状态的配合。
 * 输入/前置：canvasStory 传入 helper 新建的 <canvas>（已插入 DOM，CSS 100% 撑满舞台）。
 *           顶部两个副作用导入缺一不可：@leafer-in/state 注册 states/state/hoverStyle/pressStyle
 *           等属性并把 pointer.enter/leave/down/up 接到状态切换；@leafer-in/animate 注册 transition/
 *           transitionOut 并让状态切换走动画（不引入 animate，transition 退化为瞬变，无过渡）。
 *           本课公开输入：state（命名状态 idle/primary/danger）、duration（过渡时长，秒）、
 *           easing（缓动曲线）。
 * 主要操作：new Leafer({ view: canvas }) 复用传入 <canvas>；建一个 button:true 的 Box（origin 居中），
 *           预置 states={idle,primary,danger} 三套命名样式 + hoverStyle + pressStyle（pressStyle 内置
 *           transitionOut:'bounce-out' 演示「退出状态」单独的过渡）。子元素 Text 靠 button:true 自动同步 hover。
 *           update 按 args 设 box.transition={duration,easing}（状态进入过渡参数）与 box.state（触发命名状态切换）。
 *           一个渲染循环持续轮询：State.isHover/isPress 读交互状态、box.__animate 读过渡 running/time/duration，
 *           派生「当前状态 / 悬停 / 按下 / 过渡进度」四项读数。
 * 预期结果：切换「命名状态」→ Box 按当前 duration/easing 缓动到新样式，过渡进度从 0% 爬到 100% 后回「空闲」；
 *           鼠标悬停 Box → 悬停=是、fill/scale 过渡到 hoverStyle；按下 → 按下=是、过渡到 pressStyle，
 *           松开按 bounce-out 弹回；调大 duration → 上述过渡都变慢、进度读数更易观察。
 * 阅读主线：createTransitionState → 建舞台/Box/Text → 配 states 与状态样式 → pollReadout 派发读数 →
 *           update 同步 transition 与 state → dispose 销毁渲染循环与 leafer。
 */
import '@leafer-in/state'; // 副作用：注册交互状态属性，把指针事件接到状态切换
import '@leafer-in/animate'; // 副作用：注册 transition，让状态切换走动画过渡
import { Leafer, Box, Text, State, type IUI } from 'leafer-ui';
import {
  createResizeObserver,
  createRenderLoop,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TransitionStateName = 'idle' | 'primary' | 'danger';

// 缓动名取自 IAnimateEasingName 的常用子集（见正文参考表）。
export type TransitionEasing =
  | 'ease'
  | 'linear'
  | 'ease-in-out'
  | 'back-out'
  | 'bounce-out'
  | 'elastic-out';

export interface TransitionStateOptions {
  state: TransitionStateName;
  /** 过渡时长（秒），对应 IAnimateOptions.duration。 */
  duration: number;
  /** 缓动曲线，对应 IAnimateOptions.easing。 */
  easing: TransitionEasing;
}

export interface TransitionStateSnapshot {
  /** 当前命名状态（回读 box.state，证明 state 属性已生效）。 */
  state: string;
  /** 是否处于 hover（State.isHover）。 */
  hover: string;
  /** 是否处于 press（State.isPress）。 */
  press: string;
  /** 过渡进度：过渡进行中显示百分比，空闲时显示「空闲」。 */
  progress: string;
}

export interface TransitionStateInstance {
  update(options: TransitionStateOptions): void;
  dispose(): void;
}

// 读取 box 当前 transition 动画实例（@leafer-in/animate 在切换状态时写入 __animate）。
// Animate 暴露 running / completed / time / duration，用来算过渡进度。
interface IAnimateLike {
  running: boolean;
  completed: boolean;
  time: number;
  duration: number;
}

function readProgress(box: IUI): string {
  const animate = (box as unknown as { __animate?: IAnimateLike }).__animate;
  if (
    animate &&
    animate.running &&
    !animate.completed &&
    animate.duration > 0
  ) {
    const ratio = Math.min(1, Math.max(0, animate.time / animate.duration));
    return `${Math.round(ratio * 100)}%`;
  }
  return '空闲';
}

export function createTransitionState(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TransitionStateSnapshot) => void,
): TransitionStateInstance {
  const initial = readCanvasSize(canvas);
  const leafer = new Leafer({
    view: canvas,
    width: initial.width,
    height: initial.height,
    fill: '#f8fafc',
  });

  const title = new Text({
    text: '切换命名状态或悬停 / 按下按钮，观察过渡进度',
    fontSize: 16,
    fontWeight: 600,
    fill: '#475569',
    hittable: false,
  });
  leafer.add(title);

  const hint = new Text({
    text: 'transition 控制状态过渡的速度与曲线 · pressStyle 退出用 bounce-out',
    fontSize: 12,
    fill: '#94a3b8',
    hittable: false,
  });
  leafer.add(hint);

  // Box 是主角：button:true 让子元素 Text 自动同步 hover；origin 居中让 scale 从中心缩放。
  // states 预置三套命名样式，切换 box.state 时引擎按 transition 缓动到目标样式。
  // hoverStyle/pressStyle 由 pointer 事件自动触发（enter/leave、down/up）。
  const box = new Box({
    around: 'center',
    width: 180,
    height: 84,
    fill: '#6366f1',
    cornerRadius: 14,
    origin: 'center',
    button: true,
    cursor: 'pointer',
    transition: { duration: 0.6, easing: 'ease' },
    states: {
      idle: { fill: '#6366f1', scale: 1, cornerRadius: 14 },
      primary: { fill: '#22c55e', scale: 1.08, cornerRadius: 18 },
      danger: { fill: '#ef4444', scale: 0.94, cornerRadius: 26 },
    },
    state: 'idle',
    hoverStyle: { fill: '#0ea5e9', scale: 1.12, cornerRadius: 20 },
    // pressStyle 内置 transitionOut：松开时按 bounce-out 弹回，区别于进入时的 ease。
    pressStyle: {
      fill: '#f59e0b',
      scale: 0.9,
      transitionOut: 'bounce-out',
    },
    children: [
      {
        tag: 'Text',
        text: 'Button',
        fontSize: 18,
        fontWeight: 700,
        padding: [8, 16],
        fill: 'rgba(255,255,255,0.85)',
        // button:true 下，父级 hover 会同步给子元素，子元素自己的 hoverStyle 进一步覆盖。
        hoverStyle: { fill: '#ffffff' },
      } as ConstructorParameters<typeof Text>[0],
    ],
  });
  leafer.add(box);

  function layout() {
    const size = readCanvasSize(canvas);
    leafer.resize({ width: size.width, height: size.height });

    title.set({ x: 24, y: 22 });
    hint.set({ x: 24, y: size.height - 28 });

    // around:'center' + 居中坐标，让 Box 始终在舞台中央缩放，不随尺寸变化偏移。
    box.set({ x: size.width / 2, y: size.height / 2 });
  }

  // 轮询派发读数：State.isHover/isPress 反映实时交互，readProgress 反映过渡是否在跑。
  function pollReadout() {
    emit({
      state: box.state || '—',
      hover: State.isHover(box) ? '是' : '否',
      press: State.isPress(box) ? '是' : '否',
      progress: readProgress(box),
    });
  }

  const resizeObserver = createResizeObserver(canvas, layout);
  layout();

  // 用渲染循环持续读交互与过渡状态；离屏或页面隐藏时自动暂停。
  const renderLoop = createRenderLoop(canvas, () => {
    pollReadout();
  });

  return {
    update(options) {
      // transition 是「状态进入」的过渡参数：duration/easing 同时作用于命名状态切换与 hover/press 进入。
      box.transition = { duration: options.duration, easing: options.easing };
      // 命名状态切换会触发一次过渡；赋同值会被 __setAttr 短路，故仅在实际变化时切换。
      if (box.state !== options.state) {
        box.state = options.state;
      }
      pollReadout();
    },
    dispose() {
      renderLoop.dispose();
      resizeObserver.disconnect();
      leafer.destroy();
    },
  };
}
