/**
 * 范例介绍:把四个系统交互插件串成一条「导出报告」流水线,观察各插件的衔接顺序与中断分支。
 * 输入:运行开关、用户是否在保存对话框点取消。
 * 操作:打开「运行流水线」后按步推进——save 选路径 →(fs 写入文件,见 3.3 课)→ writeText 复制路径 → revealItemInDir 定位 → sendNotification 通知完成。
 * 预期结果:正常时四步依次完成;勾选「用户取消」时 save 返回 null,流水线在第一步中断,后续步骤跳过。
 * 阅读主线:advance() 按时序推进步骤状态,draw() 画节点条与说明区,读数每步一行。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface PipelineArgs {
  run: boolean;
  userCancelsSave: boolean;
}

export interface PipelineSnapshot {
  rows: Array<[string, string]>;
}

export interface PipelineInstance {
  update(options: PipelineArgs): void;
  dispose(): void;
}

type StepState = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

interface Step {
  fn: string;
  state: StepState;
  detail: string;
}

/** 流水线的目标路径与各步结果,与官方文档的返回值形态一致 */
const TARGET_PATH = '/Users/me/Documents/report.pdf';
const STEP_DELAY = 800;

export function createPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PipelineSnapshot) => void,
): PipelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PipelineArgs = { run: false, userCancelsSave: false };

  const steps: Step[] = [
    { fn: 'save()', state: 'pending', detail: '' },
    { fn: 'writeText(path)', state: 'pending', detail: '' },
    { fn: 'revealItemInDir(path)', state: 'pending', detail: '' },
    { fn: 'sendNotification(…)', state: 'pending', detail: '' },
  ];
  // fs 写入是真实导出的必经一步,但不属于本课四插件,画成虚线提示节点
  let fsNode: 'pending' | 'active' | 'done' | 'skipped' = 'pending';
  let finished: 'idle' | 'running' | 'done' | 'interrupted' = 'idle';
  let timers: ReturnType<typeof setTimeout>[] = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function reset() {
    steps.forEach((step) => {
      step.state = 'pending';
      step.detail = '';
    });
    fsNode = 'pending';
    finished = 'idle';
  }

  function update(options: PipelineArgs) {
    current = options;
    clearTimers();
    reset();

    if (!current.run) {
      draw();
      emitSnapshot();
      return;
    }

    finished = 'running';
    steps[0].state = 'active';
    steps[0].detail = '等待用户选择保存位置…';
    draw();
    emitSnapshot();
    schedule(0);
  }

  /** 按步推进:每步完成后调度下一步;用户取消时在第一步中断 */
  function schedule(stepIndex: number) {
    timers.push(
      setTimeout(() => {
        advance(stepIndex);
      }, stepIndex === 0 ? 0 : STEP_DELAY),
    );
  }

  function advance(stepIndex: number) {
    if (stepIndex === 0) {
      if (current.userCancelsSave) {
        steps[0].state = 'failed';
        steps[0].detail = '用户取消 → 返回 null,拿到 null 不能继续用';
        steps.slice(1).forEach((step) => {
          step.state = 'skipped';
        });
        fsNode = 'skipped';
        finished = 'interrupted';
        draw();
        emitSnapshot();
        return;
      }
      steps[0].state = 'done';
      steps[0].detail = `返回目标路径:${TARGET_PATH}`;
      fsNode = 'active';
    } else if (stepIndex === 1) {
      fsNode = 'done';
      steps[1].state = 'active';
      steps[1].detail = '把目标路径写进系统剪贴板…';
    } else if (stepIndex === 2) {
      steps[1].state = 'done';
      steps[1].detail = '剪贴板当前内容 = 目标路径(Promise<void>)';
      steps[2].state = 'active';
      steps[2].detail = '在文件管理器中定位文件…';
    } else if (stepIndex === 3) {
      steps[2].state = 'done';
      steps[2].detail = '文件管理器已打开并高亮 report.pdf(Promise<void>)';
      steps[3].state = 'active';
      steps[3].detail = '发送系统通知…';
    } else {
      steps[3].state = 'done';
      steps[3].detail = 'title: "导出完成" / body: 报告已保存(Promise<void>)';
      finished = 'done';
    }

    draw();
    emitSnapshot();

    // 还有后续步骤时继续调度;中断或全部完成时 finished 已离开 running
    if (finished === 'running') {
      schedule(stepIndex + 1);
    }
  }

  function emitSnapshot() {
    emit({
      rows: [
        ...steps.map((step, index) => [
          `步骤 ${index + 1} ${step.fn}`,
          `${stateLabel(step.state)}${step.detail ? ` · ${step.detail}` : ''}`,
        ] as [string, string]),
        ['流水线状态', stateLabel(finished)],
      ],
    });
  }

  function stateLabel(state: string): string {
    switch (state) {
      case 'pending':
        return '未开始';
      case 'active':
        return '进行中';
      case 'done':
        return '完成';
      case 'failed':
        return '中断';
      case 'skipped':
        return '跳过';
      case 'running':
        return '运行中';
      case 'idle':
        return '未运行';
      default:
        return String(state);
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.textAlign = 'left';
    drawingContext.fillText('「导出报告」的系统交互流水线', 28, 34);

    drawNodes(width);
    drawNotes(width);
  }

  /** 节点条:四个插件步骤 + fs 提示节点;颜色表达 pending / active / done / failed / skipped */
  function drawNodes(width: number) {
    const specs = [
      { title: '1 save', state: steps[0].state, plugin: 'dialog' },
      { title: 'fs 写入', state: fsNode, plugin: '3.3 课', dashed: true },
      { title: '2 writeText', state: steps[1].state, plugin: 'clipboard' },
      { title: '3 revealItemInDir', state: steps[2].state, plugin: 'opener' },
      { title: '4 sendNotification', state: steps[3].state, plugin: 'notification' },
    ];

    const boxWidth = 104;
    const gap = Math.max(14, (width - 56 - boxWidth * 5) / 4);
    const y = 64;

    specs.forEach((spec, index) => {
      const x = 28 + index * (boxWidth + gap);
      const colors = stateColor(spec.state);

      drawingContext.setLineDash(spec.dashed ? [5, 4] : []);
      drawingContext.fillStyle = colors.fill;
      drawingContext.strokeStyle = colors.stroke;
      roundRect(x, y, boxWidth, 62, 8);
      drawingContext.fill();
      drawingContext.stroke();
      drawingContext.setLineDash([]);

      drawingContext.fillStyle = colors.text;
      drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.textAlign = 'center';
      drawingContext.fillText(spec.title, x + boxWidth / 2, y + 22);

      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(spec.plugin, x + boxWidth / 2, y + 40);

      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(stateLabel(spec.state), x + boxWidth / 2, y + 54);
      drawingContext.textAlign = 'left';

      if (index < specs.length - 1) {
        drawingContext.strokeStyle = '#94a3c4';
        drawingContext.beginPath();
        drawingContext.moveTo(x + boxWidth + 2, y + 31);
        drawingContext.lineTo(x + boxWidth + gap - 2, y + 31);
        drawingContext.stroke();
      }
    });
  }

  /** 说明区:中断分支与关键判断,正文断言在这里可核对 */
  function drawNotes(width: number) {
    const x = 28;
    const y = 160;
    const w = width - 56;
    const h = Math.max(150, Math.max(360, readCanvasSize(canvas).height) - 190);

    drawingContext.fillStyle = '#f4f6fb';
    drawingContext.strokeStyle = '#c3cde3';
    roundRect(x, y, w, h, 10);
    drawingContext.fill();
    drawingContext.stroke();

    const lines: Array<[string, string]> = [];
    if (finished === 'idle') {
      lines.push(['未运行', '打开「运行流水线」开始模拟。']);
    }
    if (finished === 'running') {
      lines.push(['进行中', '按 save → fs 写入 → 复制路径 → 定位文件 → 通知 顺序推进。']);
    }
    if (finished === 'done') {
      lines.push(['完成', '四个插件各司其职:dialog 拿路径,clipboard 分享路径,opener 定位文件,notification 报告结果。']);
      lines.push(['取消分支', 'save 返回 null 时流水线在此中断——先判 null 再继续,是组合使用的第一道检查。']);
    }
    if (finished === 'interrupted') {
      lines.push(['中断', 'save() 返回 null(用户取消),后续步骤全部跳过。']);
      lines.push(['判断', 'null 不是错误,但说明用户放弃了导出;代码里先判 null 再往下走。']);
    }

    lines.forEach(([label, text], index) => {
      const lineY = y + 36 + index * 52;
      drawingContext.fillStyle = '#1d2b4f';
      drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, x + 20, lineY);
      drawingContext.fillStyle = '#5a6a8c';
      drawingContext.font = '13px ui-sans-serif, system-ui, sans-serif';
      wrapText(text, x + 20, lineY + 20, w - 40, 19);
    });
  }

  function wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    let line = '';
    let cursorY = y;
    for (const char of text) {
      const test = line + char;
      if (drawingContext.measureText(test).width > maxWidth && line) {
        drawingContext.fillText(line, x, cursorY);
        line = char;
        cursorY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      drawingContext.fillText(line, x, cursorY);
    }
  }

  function stateColor(state: string) {
    switch (state) {
      case 'done':
        return { fill: '#e8f6ee', stroke: '#5fae7f', text: '#25764b' };
      case 'active':
        return { fill: '#e6eeff', stroke: '#4f7cff', text: '#1d3fbf' };
      case 'failed':
        return { fill: '#fdecec', stroke: '#d64545', text: '#b3352f' };
      case 'skipped':
        return { fill: '#f1f3f8', stroke: '#c3cde3', text: '#8792ad' };
      case 'interrupted':
        return { fill: '#fdecec', stroke: '#d64545', text: '#b3352f' };
      default:
        return { fill: '#eef2fb', stroke: '#c3cde3', text: '#5a6a8c' };
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, radius: number) {
    drawingContext.beginPath();
    drawingContext.moveTo(x + radius, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, radius);
    drawingContext.arcTo(x + w, y + h, x, y + h, radius);
    drawingContext.arcTo(x, y + h, x, y, radius);
    drawingContext.arcTo(x, y, x + w, y, radius);
    drawingContext.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update,
    dispose() {
      clearTimers();
      resizeObserver.disconnect();
    },
  };
}
