/**
 * 范例介绍：同一个周期任务，调度器放在 SW 内存（setInterval）与浏览器侧
 * （chrome.alarms）在 service worker 按需启停下的不同命运。
 * 前置状态：两个场景相互独立；0 秒时刻各自注册定时并开始执行任务，任务本身
 * 不调用扩展 API（每次调用都会重置 30 秒空闲计时，属最佳实践中的反模式）。
 * 主要操作：调整「任务间隔」，0–150 秒的模拟时间轴随之重绘。
 * 预期结果：场景 A 的 SW 在 30 秒空闲后终止，setInterval 随之消失，任务静默
 * 停止；场景 B 的闹钟登记在浏览器侧，每次到点都把 SW 唤醒（终止过则冷启动）。
 * 阅读主线：条带是 SW 存活区间；场景 A 在 30 秒处画上终止线，场景 B 靠到点续命。
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

export interface IntervalVsAlarmsOptions {
  interval: number;
}

export interface IntervalVsAlarmsSnapshot {
  intervalLabel: string;
  intervalFires: string;
  alarmFires: string;
  coldStarts: string;
}

export interface IntervalVsAlarmsInstance {
  update(options: IntervalVsAlarmsOptions): void;
  dispose(): void;
}

const HORIZON = 150; // 模拟时间轴长度（秒）
const IDLE_LIMIT = 30; // SW 空闲终止时间（秒）

interface ScenarioData {
  blocks: TimelineBlock[];
  snapshot: IntervalVsAlarmsSnapshot;
}

function buildData(interval: number): ScenarioData {
  // 场景 A：setInterval 的回调链只活在 SW 全局作用域里，回调不重置空闲计时，
  // 所以只有严格早于终止时刻的回调能执行。
  const intervalFires: number[] = [];
  for (let t = interval; t < IDLE_LIMIT; t += interval) {
    intervalFires.push(t);
  }

  // 场景 B：闹钟登记在浏览器侧；首个到点在一个周期之后（periodInMinutes 语义）。
  const alarmFires: number[] = [];
  for (let t = interval; t <= HORIZON; t += interval) {
    alarmFires.push(t);
  }

  // SW 存活区间：create 是扩展 API 调用，登记后重置空闲计时；每次到点再重置
  // 30 秒。到点时 SW 已终止（严格晚于存活区间）则冷启动。
  const windows: Array<{ from: number; to: number }> = [
    { from: 0, to: IDLE_LIMIT },
  ];
  let aliveUntil = IDLE_LIMIT;
  let coldStarts = 0;
  let firstColdFire = -1;
  for (const fire of alarmFires) {
    if (fire > aliveUntil) {
      coldStarts += 1;
      if (firstColdFire < 0) {
        firstColdFire = fire;
      }
      windows.push({ from: fire, to: fire + IDLE_LIMIT });
      aliveUntil = fire + IDLE_LIMIT;
    } else {
      aliveUntil = Math.max(aliveUntil, fire + IDLE_LIMIT);
      windows[windows.length - 1].to = aliveUntil;
    }
  }

  const markSize = alarmFires.length > 20 ? 3.5 : 5;
  const alarmMarks: TimelineMark[] = [
    { at: 0, shape: 'circle', size: 4.5 },
  ];
  for (const fire of alarmFires) {
    let label: string | undefined;
    if (fire === firstColdFire) {
      label = '冷启动';
    } else if (coldStarts === 0 && fire === alarmFires[0]) {
      label = 'onAlarm';
    }
    alarmMarks.push({ at: fire, size: markSize, label });
  }

  const blocks: TimelineBlock[] = [
    {
      title: '场景 A：setInterval（调度器在 SW 内存里）',
      markers: [
        { at: IDLE_LIMIT, label: 'SW 终止，定时器随之消失', tone: 'error' },
      ],
      lanes: [
        {
          label: 'SW 存活',
          bars: [{ from: 0, to: IDLE_LIMIT, tone: 'muted' }],
        },
        {
          label: '到点触发',
          marks: intervalFires.map(
            (fire): TimelineMark => ({
              at: fire,
              shape: 'circle',
              tone: 'muted',
              size: 4,
            }),
          ),
        },
      ],
    },
    {
      title: '场景 B：chrome.alarms（调度器在浏览器侧）',
      lanes: [
        { label: 'SW 存活', bars: windows },
        { label: '到点触发', marks: alarmMarks },
      ],
    },
  ];

  const intervalSummary =
    intervalFires.length === 0
      ? '0 次 — SW 在 30 秒已终止'
      : `${intervalFires.length} 次 — 30 秒后不再触发`;
  const alarmSummary =
    alarmFires.length <= 4
      ? `${alarmFires.length} 次（${alarmFires
          .map((t) => `${t}s`)
          .join(' · ')}）`
      : `${alarmFires.length} 次，持续到时间轴末尾`;
  const coldSummary =
    coldStarts === 0 ? '0 次 — 到点间隔短，SW 一直存活' : `${coldStarts} 次`;

  return {
    blocks,
    snapshot: {
      intervalLabel: `每 ${interval} 秒`,
      intervalFires: intervalSummary,
      alarmFires: alarmSummary,
      coldStarts: coldSummary,
    },
  };
}

export function createIntervalVsAlarms(
  canvas: HTMLCanvasElement,
  emit: (snapshot: IntervalVsAlarmsSnapshot) => void,
): IntervalVsAlarmsInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let interval = 45;

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const data = buildData(interval);
    drawTimeline(drawingContext, width, height, {
      horizon: HORIZON,
      top: 40,
      tickStep: 30,
      blocks: data.blocks,
    });

    emit(data.snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      interval = options.interval;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
