/**
 * 范例介绍：补间实验台——用 obj.animate 驱动一个矩形，逐项核对 Fabric 补间引擎的行为：
 * 1. 分发：obj.animate({ 目标值映射 }) 内部对 colorProperties（fill / stroke /
 *    backgroundColor）自动改走 util.animateColor，数值属性走 util.animate；
 * 2. 回调序列：onChange(value, valueProgress, durationProgress) 每帧回调；到达时长后
 *    先以终值回调一次 onChange，再回调 onComplete；
 * 3. 渲染职责：补间只改值、不重绘——onChange 里必须 requestRenderAll（渲染模型见
 *    1.3 课）；颜色值经直接赋值写入、不置 dirty，关闭「补间时标记缓存失效」可复现
 *    “读数在变、画面颜色不动”的缓存坑；
 * 4. 覆盖式重启：改任一控件都会重启补间；进行中的旧补间经 abort 回调
 *    （token 不一致时返回 true）在下一帧自行中止，不再发帧、不触发 onComplete。
 * 输入：目标属性（left / angle / scaleX+scaleY / fill）、缓动曲线（util.ease 选段）、
 * 时长 duration、是否每帧标记缓存失效。
 * 预期结果：readout 的「属性当前值 / 值进度 / 时间进度 / 已运行时长 / 状态 /
 * 覆盖重启次数」与画面运动逐项对应正文断言。
 * 阅读主线：update() → startTween()（token 覆盖 + 起点重置 + 目标映射分发）→
 * onChange 三件套（置 dirty / requestRenderAll / 读数）→ dispose() 的取消收尾。
 */
import { Canvas, Rect, runningAnimations, util } from 'fabric';
import { createResizeObserver } from '../../assets/canvas-runtime.js';

/** 读者输入：对应 Controls 面板 */
export interface AnimationLabOptions {
  /** 补间目标属性；fill 命中 colorProperties，内部自动改走颜色补间 */
  target: 'left' | 'angle' | 'scale' | 'fill';
  /** util.ease 的缓动名（正文清单的选段） */
  easing: string;
  /** duration（ms） */
  duration: number;
  /** 颜色补间时是否每帧 rect.set('dirty', true) 重建缓存位图 */
  markDirty: boolean;
}

/** 派生读数：由 readout 显示 */
export interface AnimationLabSnapshot {
  /** 目标属性当前值（带单位 / rgba 字符串） */
  propValue: string;
  /** 值进度（valueProgress） */
  valueProgress: string;
  /** 时间进度（durationProgress） */
  durationProgress: string;
  /** 已运行时长（durationProgress × duration 折算） */
  elapsedMs: number;
  /** 当前缓动名 */
  easing: string;
  /** 当前补间状态 */
  state: string;
  /** 未完成即被覆盖重启的次数 */
  restarts: number;
}

export interface AnimationLabInstance {
  update(options: AnimationLabOptions): void;
  dispose(): void;
}

/** 补间句柄：obj.animate 返回映射里每条动画的最小使用面（AnimationBase 公共成员） */
interface TweenHandle {
  state: string;
  isDone(): boolean;
  abort(): void;
}

/** util.ease 的键集合，用于把面板上的缓动名索引成函数 */
type EasingKey = keyof typeof util.ease;

/** 舞台未挂载时读不到尺寸，先按兜底值创建，挂载后由 ResizeObserver 校正 */
const INITIAL_SIZE = { width: 640, height: 360 };
const RECT_SIZE = { width: 120, height: 84 };
/** left 补间相对画布中心的终点偏移 */
const LEFT_SPAN = 150;
/** scale 补间的终点倍数 */
const END_SCALE = 1.8;
/** fill 补间的起点 / 终点颜色 */
const START_FILL = '#4f7cff';
const END_FILL = '#e11d48';

export function createAnimationLab(
  canvasEl: HTMLCanvasElement,
  emit: (snapshot: AnimationLabSnapshot) => void,
): AnimationLabInstance {
  const fabricCanvas = new Canvas(canvasEl, { ...INITIAL_SIZE });

  // 演示主体：原点居中，left / angle / scale 都围绕中心变化，便于观察
  const rect = new Rect({
    left: INITIAL_SIZE.width / 2,
    top: INITIAL_SIZE.height / 2,
    width: RECT_SIZE.width,
    height: RECT_SIZE.height,
    originX: 'center',
    originY: 'center',
    fill: START_FILL,
  });
  // 起点 / 终点的虚线参照框（不参与交互）；fill / angle 模式下隐藏
  const ghostOptions = {
    width: RECT_SIZE.width,
    height: RECT_SIZE.height,
    originX: 'center' as const,
    originY: 'center' as const,
    fill: undefined,
    stroke: '#94a3b8',
    strokeWidth: 1.5,
    strokeDashArray: [6, 6],
    selectable: false,
    evented: false,
  };
  const startGhost = new Rect(ghostOptions);
  const endGhost = new Rect(ghostOptions);
  fabricCanvas.add(startGhost, endGhost, rect);

  let options: AnimationLabOptions = {
    target: 'left',
    easing: 'defaultEasing',
    duration: 1000,
    markDirty: true,
  };
  // 每次重启递增；旧补间在下一帧发现 token 换人，经 abort 回调自行中止
  let tweenToken = 0;
  let restarts = 0;
  let phase = '待启动';
  let lastValue = '';
  let lastValueProgress = 0;
  let lastDurationProgress = 0;
  let activeHandles: TweenHandle[] = [];

  function formatValue(
    target: AnimationLabOptions['target'],
    value: number | string,
  ) {
    switch (target) {
      case 'left':
        return `${Math.round(Number(value))} px`;
      case 'angle':
        return `${Math.round(Number(value))}°`;
      case 'scale':
        return `×${Math.round(Number(value) * 100) / 100}`;
      default:
        return String(value); // 颜色补间的回调值是 rgba(...) 字符串
    }
  }

  function emitSnapshot() {
    emit({
      propValue: lastValue,
      valueProgress: `${Math.round(lastValueProgress * 100)} %`,
      durationProgress: `${Math.round(lastDurationProgress * 100)} %`,
      elapsedMs: Math.round(lastDurationProgress * options.duration),
      easing: options.easing,
      state: phase,
      restarts,
    });
  }

  function center() {
    return { x: fabricCanvas.width / 2, y: fabricCanvas.height / 2 };
  }

  function syncGhosts(target: AnimationLabOptions['target']) {
    const show = target === 'left' || target === 'scale';
    const { x, y } = center();
    startGhost.set({
      visible: show,
      left: target === 'left' ? x - LEFT_SPAN : x,
      top: y,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    });
    endGhost.set({
      visible: show,
      left: target === 'left' ? x + LEFT_SPAN : x,
      top: y,
      angle: 0,
      scaleX: target === 'scale' ? END_SCALE : 1,
      scaleY: target === 'scale' ? END_SCALE : 1,
    });
  }

  /**
   * 启动（或覆盖重启）一条补间。countRestart 为 true 时把“顶掉未完成补间”
   * 计入读数；尺寸校正触发的重启不计，避免挂载基线被污染。
   */
  function startTween(countRestart: boolean) {
    if (countRestart && activeHandles.some((handle) => !handle.isDone())) {
      restarts += 1;
    }
    const token = ++tweenToken;
    const { target, easing, duration, markDirty } = options;
    const { x, y } = center();

    // 先重置回起点：obj.animate 的 startValue 默认取对象当前值，重置保证可复现
    const startValue: number | string =
      target === 'left'
        ? x - LEFT_SPAN
        : target === 'scale'
          ? 1
          : target === 'angle'
            ? 0
            : START_FILL;
    rect.set({
      left: target === 'left' ? x - LEFT_SPAN : x,
      top: y,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      fill: START_FILL,
    });
    syncGhosts(target);
    phase = '运行中';
    lastValue = formatValue(target, startValue);
    lastValueProgress = 0;
    lastDurationProgress = 0;

    const onChange = (
      value: number | string,
      valueProgress: number,
      durationProgress: number,
    ) => {
      // 补间本身不重绘：让画面跟上修改是 onChange 的职责（渲染模型见 1.3 课）
      if (target === 'fill' && markDirty) {
        // 颜色经直接赋值写入、不置 dirty；不标记则缓存位图不重建，画面停在旧颜色
        rect.set('dirty', true);
      }
      fabricCanvas.requestRenderAll();
      lastValue = formatValue(target, value);
      lastValueProgress = valueProgress;
      lastDurationProgress = durationProgress;
      emitSnapshot();
    };

    const shared = {
      duration,
      easing: util.ease[easing as EasingKey],
      // 旧补间在下一帧发现 token 已换：返回 true 即自行中止（不触发 onComplete）
      abort: () => {
        if (token !== tweenToken) {
          phase = '已被覆盖中止';
          return true;
        }
        return false;
      },
      onChange,
      onComplete: () => {
        phase = '已完成';
        emitSnapshot();
      },
    };

    // 目标值映射：fill 命中 colorProperties，内部自动改走 util.animateColor
    const anims =
      target === 'left'
        ? rect.animate({ left: x + LEFT_SPAN }, shared)
        : target === 'angle'
          ? rect.animate({ angle: 360 }, shared)
          : target === 'scale'
            ? rect.animate({ scaleX: END_SCALE, scaleY: END_SCALE }, shared) // 一次调用起两条并行补间
            : rect.animate({ fill: END_FILL }, shared);
    activeHandles = Object.values(anims);
    emitSnapshot();
  }

  function syncSize() {
    const stage = fabricCanvas.wrapperEl.parentElement;
    if (!stage) {
      return;
    }
    const width = Math.floor(stage.clientWidth) || INITIAL_SIZE.width;
    const height = Math.floor(stage.clientHeight) || INITIAL_SIZE.height;
    // setDimensions 按当前 retina 倍率重设物理像素，并自动 requestRenderAll
    fabricCanvas.setDimensions({ width, height });
    // 几何变了：按新画布尺寸重启补间（不计入覆盖读数）
    startTween(false);
  }

  const resizeObserver = createResizeObserver(fabricCanvas.wrapperEl, () =>
    syncSize(),
  );

  function update(next: AnimationLabOptions) {
    options = next;
    startTween(true);
  }

  emitSnapshot(); // 挂载基线读数（首个 apply 随即启动补间）

  return {
    update,
    dispose() {
      resizeObserver.disconnect();
      // 取消未完成的补间（含 delay 中等待的）：对象级精确取消；
      // canvas.dispose 内部还会按画布再清一次（cancelByCanvas）
      runningAnimations.cancelByTarget(rect);
      void fabricCanvas.dispose();
    },
  };
}
