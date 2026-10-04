/**
 * 范例介绍：chrome.alarms.create 的三种时间参数怎样决定触发计划，
 * 打包扩展的 30 秒下限与同名重建又怎样改变它。
 * 前置状态：时间轴 0 点执行一次 create；「未打包」开关决定是否受 30 秒下限约束。
 * 主要操作：切换时间参数与时长、切换打包状态、开启第 20 秒的同名重建。
 * 预期结果：上泳道是代码请求的触发时刻，下泳道是 Chrome 实际执行的触发时刻；
 * 打包状态下低于 30 秒的 delayInMinutes / periodInMinutes 会被警告并按 30 秒
 * 执行，when 请求 30 秒内不警告但同样不会早于 30 秒触发；同名 create 会
 * 取消未触发的旧计划并从重建时刻重排。
 * 阅读主线：两条泳道的错位就是下限与重建的净效果。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';
import {
  drawTimeline,
  type TimelineBlock,
  type TimelineMark,
} from './timeline';

export type ScheduleParam = 'delay' | 'when' | 'period';

export interface ScheduleOptions {
  param: ScheduleParam;
  minutes: number;
  unpacked: boolean;
  recreate: boolean;
}

export interface ScheduleSnapshot {
  paramLabel: string;
  packageLabel: string;
  firstFire: string;
  period: string;
  recreate: string;
}

export interface ScheduleInstance {
  update(options: ScheduleOptions): void;
  dispose(): void;
}

const MIN_INTERVAL = 30; // 打包扩展的最小触发间隔（Chrome 120+），秒
const REBUILD_AT = 20; // 模拟同名重建发生的时刻，秒
const SERIES_LENGTH = 6; // 周期计划最多绘制的触发次数

interface Plan {
  requestedSeconds: number;
  effectiveSeconds: number;
  clamped: boolean;
  warned: boolean;
  isPeriod: boolean;
  base: number;
  requestedTimes: number[];
  effectiveTimes: number[];
  horizon: number;
}

function formatMinutes(minutes: number): string {
  return String(Math.round(minutes * 100) / 100);
}

function buildPlan(options: ScheduleOptions): Plan {
  const requestedSeconds = options.minutes * 60;
  const packed = !options.unpacked;
  // delayInMinutes / periodInMinutes：低于下限会被警告并按 30 秒执行；
  // when：请求 30 秒内不警告，但实际触发不会早于 30 秒。
  const clamped = packed && requestedSeconds < MIN_INTERVAL;
  const warned = clamped && options.param !== 'when';
  const effectiveSeconds = clamped ? MIN_INTERVAL : requestedSeconds;
  const isPeriod = options.param === 'period';
  const base = options.recreate ? REBUILD_AT : 0;

  const series = (step: number): number[] =>
    Array.from(
      { length: SERIES_LENGTH },
      (_, index) => base + step * (index + 1),
    );
  const requestedTimes = isPeriod
    ? series(requestedSeconds)
    : [base + requestedSeconds];
  const effectiveTimes = isPeriod
    ? series(effectiveSeconds)
    : [base + effectiveSeconds];

  const lastPlanned = Math.max(
    requestedTimes[requestedTimes.length - 1],
    effectiveTimes[effectiveTimes.length - 1],
  );
  const horizon = Math.max(lastPlanned * 1.15 + 12, base + 70);

  return {
    requestedSeconds,
    effectiveSeconds,
    clamped,
    warned,
    isPeriod,
    base,
    requestedTimes,
    effectiveTimes,
    horizon,
  };
}

function buildBlock(options: ScheduleOptions, plan: Plan): TimelineBlock {
  const firstLabel = plan.clamped
    ? plan.warned
      ? '警告并按 30 秒执行'
      : '不早于 30 秒'
    : '首次触发';

  const requestedMarks: TimelineMark[] = [
    { at: plan.base, shape: 'circle', tone: 'muted', size: 4.5, hollow: true },
  ];
  for (const at of plan.requestedTimes) {
    requestedMarks.push({ at, tone: 'muted', hollow: true, size: 4.5 });
  }

  const executedMarks: TimelineMark[] = [
    {
      at: 0,
      shape: 'circle',
      size: 4.5,
      label: options.recreate ? undefined : 'create()',
    },
  ];
  if (options.recreate) {
    executedMarks.push({ at: plan.base, shape: 'circle', size: 4.5 });
  }
  plan.effectiveTimes.forEach((at, index) => {
    executedMarks.push({
      at,
      size: 5,
      label: index === 0 ? firstLabel : undefined,
    });
  });

  return {
    title: 'chrome.alarms.create() 之后排定的触发',
    markers: options.recreate
      ? [
          {
            at: REBUILD_AT,
            label: '第 20 秒同名 create，旧计划作废',
            tone: 'warn',
          },
        ]
      : [],
    lanes: [
      { label: '请求的计划', marks: requestedMarks },
      { label: '实际执行', marks: executedMarks },
    ],
  };
}

function buildSnapshot(options: ScheduleOptions, plan: Plan): ScheduleSnapshot {
  const minutes = formatMinutes(options.minutes);
  const paramLabel =
    options.param === 'delay'
      ? `delayInMinutes：${minutes} 分钟`
      : options.param === 'when'
        ? `when：${minutes} 分钟后`
        : `periodInMinutes：${minutes} 分钟`;
  const packageLabel = options.unpacked
    ? '未打包（开发模式）：无频率下限'
    : '已打包：受 30 秒下限（Chrome 120+）';
  const firstFire = options.recreate
    ? `重建后 ${plan.effectiveSeconds} 秒（第 20 秒起算）`
    : plan.clamped
      ? plan.warned
        ? `请求 ${plan.requestedSeconds} 秒，被上调为 ${MIN_INTERVAL} 秒`
        : `请求 ${plan.requestedSeconds} 秒，实际不早于 ${MIN_INTERVAL} 秒`
      : `${plan.effectiveSeconds} 秒后`;
  const period = plan.isPeriod
    ? `每 ${plan.effectiveSeconds} 秒${
        plan.clamped ? `（请求 ${plan.requestedSeconds} 秒被上调）` : ''
      }`
    : '单次';
  const recreate = options.recreate
    ? '第 20 秒重排：未触发的请求作废'
    : '未启用';

  return { paramLabel, packageLabel, firstFire, period, recreate };
}

function pickTickStep(horizon: number): number {
  const steps = horizon > 150 ? [60, 120, 300, 600] : [10, 15, 30];
  for (const step of steps) {
    if (horizon / step <= 8) {
      return step;
    }
  }
  return steps[steps.length - 1];
}

export function createSchedule(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScheduleSnapshot) => void,
): ScheduleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: ScheduleOptions = {
    param: 'period',
    minutes: 1,
    unpacked: false,
    recreate: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const plan = buildPlan(options);
    const inMinutes = plan.horizon > 150;
    drawTimeline(drawingContext, width, height, {
      horizon: plan.horizon,
      top: 56,
      tickStep: pickTickStep(plan.horizon),
      formatTick: inMinutes
        ? (seconds) =>
            seconds === 0 ? '0' : `${Math.round((seconds / 60) * 10) / 10}m`
        : (seconds) => `${seconds}s`,
      blocks: [buildBlock(options, plan)],
    });

    emit(buildSnapshot(options, plan));
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(next) {
      options = next;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
