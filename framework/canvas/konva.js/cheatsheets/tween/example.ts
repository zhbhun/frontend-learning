/**
 * 范例介绍：演示 Konva.Tween 的属性补间与缓动函数，以及六个播放控制方法。
 *
 * 两个独立实例：
 * 1. createEasingTween：一个圆球沿轨道往返补间（yoyo）。可切换 16 个缓动函数与时长。
 *    上方实时绘制所选缓动的「进度–时间」曲线（蓝），并叠加 Linear 参考线（灰虚线），
 *    让「缓动函数 = 速度曲线」直接可见：曲线陡处圆球快、平缓处圆球慢、过冲处圆球冲过终点。
 * 2. createPlayback：固定 EaseInOut 的单向补间，用 action 选择器调用
 *    play / pause / reverse / reset / finish / seek 六个方法，观察每个方法对圆球位置的影响。
 *
 * 关键模型：Tween 自带内部时钟与动画循环，每帧把插值结果写回节点并自动重绘所在 Layer；
 * 因此本范例不使用 createRenderLoop——重绘由 Tween 驱动。
 * 输入：update(options) 应用后，重建（实例 1）或直接调用方法（实例 2）；尺寸变化时同步 stage 宽高。
 * 预期：切换缓动 / 时长 / 播放方法，圆球运动与曲线、读数同步变化。
 */
import Konva from 'konva';
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

type EasingFn = (t: number, b: number, c: number, d: number) => number;

/** Konva.Easings 的全部 16 个函数名，按家族分组，供 stories 选择器与正文表格共用。 */
export const EASING_NAMES = [
  'Linear',
  'EaseIn',
  'EaseOut',
  'EaseInOut',
  'StrongEaseIn',
  'StrongEaseOut',
  'StrongEaseInOut',
  'BackEaseIn',
  'BackEaseOut',
  'BackEaseInOut',
  'ElasticEaseIn',
  'ElasticEaseOut',
  'ElasticEaseInOut',
  'BounceEaseIn',
  'BounceEaseOut',
  'BounceEaseInOut',
] as const;

function lookupEasing(name: string): EasingFn {
  const fn = (Konva.Easings as unknown as Record<string, EasingFn>)[name];
  if (typeof fn !== 'function') {
    return Konva.Easings.Linear;
  }
  return fn;
}

/* ===================== 缓动曲线实例 ===================== */

export interface EasingOptions {
  /** 缓动函数名（取自 EASING_NAMES）。 */
  easing: string;
  /** 单次正向时长，秒。 */
  duration: number;
}

export interface EasingSnapshot {
  easing: string;
  duration: number;
  /** 当前补间进度，0–1（yoyo 反向时会从 1 回到 0）。 */
  progress: number;
}

export interface EasingInstance {
  update(options: EasingOptions): void;
  dispose(): void;
}

const CIRCLE_FILL = '#4f7cff';
const CIRCLE_STROKE = '#1e293b';
const CURVE_COLOR = '#4f7cff';
const LINEAR_REF_COLOR = '#94a3b8';
const AXIS_COLOR = '#e2e8f0';
const TRACK_COLOR = '#cbd5e1';

export function createEasingTween(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EasingSnapshot) => void,
): EasingInstance {
  const root = canvas.parentElement as HTMLDivElement | null;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // 标题
  const title = new Konva.Text({
    text: '缓动曲线：进度（纵）随时间（横）',
    fontSize: 14,
    fontStyle: '600',
    fill: '#475569',
    listening: false,
  });
  layer.add(title);

  // 坐标轴线（进度 0 / 进度 1 两条水平参考）
  const axisGroup = new Konva.Group({ listening: false });
  layer.add(axisGroup);

  // Linear 参考曲线（灰虚线）与选中缓动曲线（蓝）
  const linearRef = new Konva.Line({
    stroke: LINEAR_REF_COLOR,
    strokeWidth: 1,
    dash: [4, 4],
    listening: false,
  });
  layer.add(linearRef);
  const curve = new Konva.Line({
    stroke: CURVE_COLOR,
    strokeWidth: 2,
    listening: false,
  });
  layer.add(curve);

  // 轨道与运动圆球
  const track = new Konva.Line({
    stroke: TRACK_COLOR,
    strokeWidth: 2,
    listening: false,
  });
  layer.add(track);
  const circle = new Konva.Circle({
    radius: 18,
    fill: CIRCLE_FILL,
    stroke: CIRCLE_STROKE,
    strokeWidth: 2,
  });
  layer.add(circle);

  let current: EasingOptions = { easing: 'EaseInOut', duration: 2 };
  let tween: Konva.Tween | null = null;
  // 最近一次布局的轨道范围，供 onUpdate 计算进度。
  let trackLeft = 0;
  let trackRight = 0;

  function rebuild() {
    const { width, height } = readCanvasSize(canvas);
    stage.width(width);
    stage.height(height);

    const padX = 56;
    const graphTop = 56;
    const graphH = 140;
    const graphLeft = padX;
    const graphW = Math.max(40, width - padX * 2);

    const trackY = Math.max(graphTop + graphH + 56, height - 60);
    trackLeft = padX;
    trackRight = width - padX;

    title.x(padX);
    title.y(28);

    // 进度范围放宽到 [-0.4, 1.4]，容纳 Elastic 的较大过冲（实测 ±0.37）。
    const PMIN = -0.4;
    const PMAX = 1.4;
    const span = PMAX - PMIN;
    const progressToY = (p: number) =>
      graphTop + graphH * (1 - (p - PMIN) / span);
    const timeToX = (f: number) => graphLeft + graphW * f;

    axisGroup.removeChildren();
    axisGroup.add(
      new Konva.Line({
        points: [graphLeft, progressToY(0), graphLeft + graphW, progressToY(0)],
        stroke: AXIS_COLOR,
        strokeWidth: 1,
      }),
      new Konva.Line({
        points: [graphLeft, progressToY(1), graphLeft + graphW, progressToY(1)],
        stroke: AXIS_COLOR,
        strokeWidth: 1,
      }),
    );

    // 采样曲线：归一化时间 f∈[0,1]，进度 = easing(f*duration, 0, 1, duration)。
    const fn = lookupEasing(current.easing);
    const N = 80;
    const pts: number[] = [];
    const linPts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const p = fn(f * current.duration, 0, 1, current.duration);
      pts.push(timeToX(f), progressToY(p));
      linPts.push(timeToX(f), progressToY(f));
    }
    curve.points(pts);
    linearRef.points(linPts);

    track.points([trackLeft, trackY, trackRight, trackY]);
    circle.y(trackY);

    // 重建补间：从轨道起点补间到终点，yoyo 循环往返。
    if (tween) {
      tween.destroy();
    }
    circle.x(trackLeft);
    tween = new Konva.Tween({
      node: circle,
      duration: current.duration,
      easing: fn,
      x: trackRight,
      yoyo: true,
      onUpdate: () => {
        const trackSpan = trackRight - trackLeft;
        const progress = trackSpan > 0 ? (circle.x() - trackLeft) / trackSpan : 0;
        emit({
          easing: current.easing,
          duration: current.duration,
          progress: Math.max(0, Math.min(1, progress)),
        });
      },
    });
    tween.play();
    layer.batchDraw();
  }

  const resizeObserver = createResizeObserver(canvas, rebuild);

  return {
    update(options) {
      current = options;
      rebuild();
    },
    dispose() {
      if (tween) {
        tween.destroy();
        tween = null;
      }
      resizeObserver.disconnect();
      stage.destroy();
    },
  };
}

/* ===================== 播放控制实例 ===================== */

export type PlaybackAction =
  | 'play'
  | 'pause'
  | 'reverse'
  | 'reset'
  | 'finish'
  | 'seek';

export const PLAYBACK_ACTIONS: PlaybackAction[] = [
  'play',
  'pause',
  'reverse',
  'reset',
  'finish',
  'seek',
];

export interface PlaybackOptions {
  /** 要执行的播放方法。 */
  action: PlaybackAction;
  /** 仅 seek 使用：跳到的时间，秒（0–duration）。 */
  seekTime: number;
}

export interface PlaybackSnapshot {
  action: PlaybackAction;
  /** 当前圆球位置映射的进度，0–1。 */
  progress: number;
  /** 方法执行后的状态描述。 */
  state: string;
}

export interface PlaybackInstance {
  update(options: PlaybackOptions): void;
  dispose(): void;
}

const PLAYBACK_DURATION = 2;
const PLAYBACK_FILL = '#f59e0b';

export function createPlayback(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PlaybackSnapshot) => void,
): PlaybackInstance {
  const root = canvas.parentElement as HTMLDivElement | null;
  if (!root) {
    throw new Error('未找到 canvas 的父容器，无法挂载 Konva Stage。');
  }

  // canvasStory 已在 div.cs-stage 内放好 canvas / 读数。Konva.Stage 建立时会
  // 清空 container（_buildDOM 的 container.innerHTML = ''），因此用一个独立
  // 包裹层承接舞台，避免清掉读数；默认 canvas 隐藏，改由 Konva 的图层 canvas
  // 承载绘制。
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.inset = '0';
  root.appendChild(wrapper);
  canvas.style.display = 'none';

  const initial = readCanvasSize(canvas);
  const stage = new Konva.Stage({
    container: wrapper,
    width: initial.width,
    height: initial.height,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  const track = new Konva.Line({
    stroke: TRACK_COLOR,
    strokeWidth: 2,
    listening: false,
  });
  layer.add(track);

  // 起点 / 终点刻度
  const startMark = new Konva.Line({
    stroke: AXIS_COLOR,
    strokeWidth: 1,
    listening: false,
  });
  const endMark = new Konva.Line({
    stroke: AXIS_COLOR,
    strokeWidth: 1,
    listening: false,
  });
  const startLabel = new Konva.Text({
    text: '起点',
    fontSize: 12,
    fill: '#94a3b8',
    listening: false,
  });
  const endLabel = new Konva.Text({
    text: '终点',
    fontSize: 12,
    fill: '#94a3b8',
    listening: false,
  });
  layer.add(startMark, endMark, startLabel, endLabel);

  const circle = new Konva.Circle({
    radius: 20,
    fill: PLAYBACK_FILL,
    stroke: CIRCLE_STROKE,
    strokeWidth: 2,
  });
  layer.add(circle);

  let trackLeft = 0;
  let trackRight = 0;
  let current: PlaybackOptions = { action: 'play', seekTime: 0 };
  // 记录最近执行的方法指纹，避免每次 apply 重复触发同一方法。
  let lastKey = '';
  let tween: Konva.Tween | null = null;
  let lastWidth = 0;

  function progressOf() {
    const span = trackRight - trackLeft;
    return span > 0 ? Math.max(0, Math.min(1, (circle.x() - trackLeft) / span)) : 0;
  }

  function buildTween() {
    if (tween) {
      tween.destroy();
    }
    circle.x(trackLeft);
    tween = new Konva.Tween({
      node: circle,
      duration: PLAYBACK_DURATION,
      easing: Konva.Easings.EaseInOut,
      x: trackRight,
      onUpdate: () => {
        emit({
          action: current.action,
          progress: progressOf(),
          state: describe(current.action),
        });
      },
      onFinish: () => {
        emit({
          action: current.action,
          progress: 1,
          state: '已到达终点',
        });
      },
    });
    tween.play();
    lastKey = 'play';
  }

  function layout() {
    const { width, height } = readCanvasSize(canvas);
    const widthChanged = width !== lastWidth;
    lastWidth = width;
    stage.width(width);
    stage.height(height);

    const padX = 64;
    const trackY = Math.round(height / 2) + 10;
    trackLeft = padX;
    trackRight = width - padX;

    track.points([trackLeft, trackY, trackRight, trackY]);
    circle.y(trackY);
    startMark.points([trackLeft, trackY - 16, trackLeft, trackY + 16]);
    endMark.points([trackRight, trackY - 16, trackRight, trackY + 16]);
    // 「起点」/「终点」各两个汉字，约 24px 宽，按半宽居中到刻度下方。
    startLabel.x(trackLeft - 12);
    startLabel.y(trackY + 22);
    endLabel.x(trackRight - 12);
    endLabel.y(trackY + 22);

    // 首次创建；容器宽度变化时重建，让补间终点对齐新的轨道末端。
    if (!tween || widthChanged) {
      buildTween();
      current = { action: 'play', seekTime: current.seekTime };
    }
    layer.batchDraw();
  }

  function describe(action: PlaybackAction): string {
    switch (action) {
      case 'play':
        return '正向播放';
      case 'pause':
        return '已暂停';
      case 'reverse':
        return '反向播放';
      case 'reset':
        return '已重置到起点';
      case 'finish':
        return '已跳到终点';
      case 'seek':
        return `跳到 ${current.seekTime.toFixed(1)}s`;
    }
  }

  function run(options: PlaybackOptions) {
    if (!tween) {
      return;
    }
    const { action, seekTime } = options;
    switch (action) {
      case 'play':
        tween.play();
        break;
      case 'pause':
        tween.pause();
        break;
      case 'reverse':
        tween.reverse();
        break;
      case 'reset':
        tween.reset();
        break;
      case 'finish':
        tween.finish();
        break;
      case 'seek':
        tween.seek(seekTime);
        break;
    }
    // 部分方法（如 pause）不触发 onUpdate，这里补一次读数。
    emit({
      action,
      progress: progressOf(),
      state: describe(action),
    });
  }

  const resizeObserver = createResizeObserver(canvas, layout);

  return {
    update(options) {
      current = options;
      layout();
      const key =
        options.action === 'seek'
          ? `seek:${options.seekTime.toFixed(1)}`
          : options.action;
      if (key !== lastKey) {
        lastKey = key;
        run(options);
      }
    },
    dispose() {
      if (tween) {
        tween.destroy();
        tween = null;
      }
      resizeObserver.disconnect();
      stage.destroy();
    },
  };
}
