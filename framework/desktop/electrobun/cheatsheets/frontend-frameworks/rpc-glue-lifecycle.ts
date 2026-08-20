/**
 * 演示内容：React 组件订阅主进程消息（rpc.addMessageListener）的生命周期——
 * 挂载时注册 listener，卸载时是否执行 removeMessageListener 的两种对照，以及
 * 卸载后主进程继续推送消息时各自的后果：正确清理则消息落空，遗漏清理则
 * listener 泄漏、幽灵回调对已卸载组件 setState。
 * 输入：effect 是否返回清理函数（cleanup）、组件是否已卸载（unmounted）、
 *   卸载动作之后的追加推送条数（lateMessages，组件未卸载时即正常推送）。
 * 操作：在 Controls 中切换三个输入。
 * 预期结果：挂载 + 清理 → 2 条消息送达、注册表 1 个 listener；卸载 + 清理 →
 *   注册表清空、追加消息落空；卸载 + 遗漏清理 → 注册表残留 1 个 listener，
 *   追加消息触发幽灵 setState（红标提示打到已卸载组件）。
 * 阅读主线：resolveGlue() 是唯一生命周期推演（步骤与 react-rpc-glue.tsx 的
 *   useNotices hook 一致：注册 → 接收 ×2 → 卸载 → 追加推送），draw() 只负责
 *   把结果画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface GlueOptions {
  cleanup: boolean;
  unmounted: boolean;
  lateMessages: number;
}

export interface GlueSnapshot {
  componentState: string;
  listeners: string;
  received: string;
  ghostUpdates: string;
  warning: string;
}

export interface GlueInstance {
  update(options: GlueOptions): void;
  dispose(): void;
}

type StepStatus = 'hit' | 'bad' | 'faint' | 'skip';

interface GlueStep {
  label: string;
  status: StepStatus;
  detail: string;
}

interface GlueResult {
  cleanup: boolean;
  unmounted: boolean;
  lateMessages: number;
  listeners: number;
  received: number;
  ghost: number;
  dropped: number;
  steps: GlueStep[];
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  faint: '#94a3b8',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  warn: '#b45309',
  bad: '#d64545',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

// 与 react-rpc-glue.tsx 的 useNotices 同序：挂载注册 → 挂载期接收 → 卸载 → 追加推送
function resolveGlue(options: GlueOptions): GlueResult {
  const late = options.lateMessages;
  const listeners = options.unmounted ? (options.cleanup ? 0 : 1) : 1;
  const received = options.unmounted ? 2 : 2 + late;
  const ghost = options.unmounted && !options.cleanup ? late : 0;
  const dropped = options.unmounted && options.cleanup ? late : 0;

  const step1: GlueStep = {
    label: '① 组件挂载',
    status: 'hit',
    detail: 'addMessageListener("pushNotice", onNotice) → 注册表 1 个 listener',
  };
  const step2: GlueStep = {
    label: '② 主进程推送 ×2',
    status: 'hit',
    detail: '分发命中 listener → setState ×2，notices 变为 2',
  };

  let step3: GlueStep;
  if (!options.unmounted) {
    step3 = { label: '③ 组件卸载', status: 'skip', detail: '未发生（组件保持挂载）' };
  } else if (options.cleanup) {
    step3 = {
      label: '③ 组件卸载',
      status: 'hit',
      detail: '执行清理：removeMessageListener → 注册表清空',
    };
  } else {
    step3 = {
      label: '③ 组件卸载',
      status: 'bad',
      detail: 'effect 未返回清理函数 → listener 残留在注册表',
    };
  }

  let step4: GlueStep;
  if (late === 0) {
    step4 = { label: '④ 追加推送', status: 'skip', detail: '无追加消息' };
  } else if (!options.unmounted) {
    step4 = {
      label: `④ 追加推送 ×${late}`,
      status: 'hit',
      detail: '组件仍挂载：正常接收 → setState ×' + late,
    };
  } else if (options.cleanup) {
    step4 = {
      label: `④ 追加推送 ×${late}`,
      status: 'faint',
      detail: `注册表为空：${late} 条消息无人接收，被丢弃`,
    };
  } else {
    step4 = {
      label: `④ 追加推送 ×${late}`,
      status: 'bad',
      detail: `幽灵回调：对已卸载组件 setState ×${late}`,
    };
  }

  return {
    cleanup: options.cleanup,
    unmounted: options.unmounted,
    lateMessages: late,
    listeners,
    received,
    ghost,
    dropped,
    steps: [step1, step2, step3, step4],
  };
}

function resultTone(result: GlueResult): string {
  if (!result.unmounted) {
    return COLORS.ok;
  }
  return result.cleanup ? COLORS.muted : COLORS.bad;
}

// 在斜杠和空格后断行，避免超出方框宽度
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text.split(/(?<=\/)|(?<= )/).filter((token) => token !== '');
  const lines: string[] = [];
  let line = '';

  for (const token of tokens) {
    const candidate = line + token;

    if (line && context.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line.trimEnd());
  }

  return lines;
}

export function createRpcGlueLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: GlueSnapshot) => void,
): GlueInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: GlueOptions = { cleanup: true, unmounted: false, lateMessages: 0 };

  function drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    tone: string | null,
  ) {
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = tone ?? COLORS.plainBorder;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, x + 12, y + 22);
  }

  function drawArrow(fromX: number, toX: number, y: number) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - 8, y);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(toX, y);
    drawingContext.lineTo(toX - 9, y - 4.5);
    drawingContext.lineTo(toX - 9, y + 4.5);
    drawingContext.closePath();
    drawingContext.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(460, size.width);
    const height = Math.max(440, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const result = resolveGlue(current);
    const tone = resultTone(result);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('主进程消息如何驱动组件？', 24, 36);

    const margin = 24;
    const top = 64;
    const gap = Math.max(20, Math.min(40, width * 0.05));
    const boxWidth = (width - margin * 2 - gap * 2) / 3;
    const boxHeight = 172;

    // 面板一：React 组件树——消息的最终去向
    drawPanel(margin, top, boxWidth, boxHeight, 'React 组件树（src/mainview）', null);

    const appX = margin + 12;
    const appY = top + 34;
    const appW = boxWidth - 24;
    drawingContext.setLineDash(result.unmounted ? [5, 4] : []);
    drawingContext.strokeStyle = result.unmounted ? COLORS.faint : COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(appX, appY, appW, 118, 6);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.fillStyle = result.unmounted ? COLORS.faint : COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('App', appX + 10, appY + 18);

    const compX = appX + 24;
    const compY = appY + 28;
    const compW = appW - 48;
    drawingContext.setLineDash(result.unmounted ? [5, 4] : []);
    drawingContext.strokeStyle = result.unmounted ? COLORS.faint : tone;
    drawingContext.beginPath();
    drawingContext.roundRect(compX, compY, compW, 74, 6);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.fillStyle = result.unmounted ? COLORS.faint : COLORS.heading;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      result.unmounted ? 'MessageList（已卸载）' : 'MessageList',
      compX + 10,
      compY + 18,
    );
    drawingContext.fillStyle = result.unmounted ? COLORS.faint : COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('useNotices()', compX + 10, compY + 36);
    drawingContext.fillStyle = result.unmounted ? COLORS.faint : tone;
    drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`notices: ${result.received}`, compX + 10, compY + 56);

    if (result.ghost > 0) {
      drawingContext.fillStyle = COLORS.bad;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      wrapText(
        `幽灵 setState ×${result.ghost}（打到已卸载组件）`,
        boxWidth - 24,
        drawingContext,
      ).forEach((line, index) => {
        drawingContext.fillText(line, margin + 12, appY + 132 + index * 15);
      });
    } else {
      drawingContext.fillStyle = COLORS.faint;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '状态由消息回调里的 setState 驱动',
        margin + 12,
        appY + 132,
      );
    }

    // 面板二：视图侧 rpc 实例——listener 注册表与分发
    const registryX = margin + boxWidth + gap;
    drawPanel(registryX, top, boxWidth, boxHeight, '视图侧 rpc 实例（单例模块）', null);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(
      'messageListeners["pushNotice"]',
      boxWidth - 24,
      drawingContext,
    ).forEach((line, index) => {
      drawingContext.fillText(line, registryX + 12, top + 46 + index * 15);
    });

    const chipY = top + 78;
    if (result.listeners > 0) {
      drawingContext.strokeStyle =
        result.unmounted && !result.cleanup ? COLORS.bad : tone;
      drawingContext.lineWidth = 1.5;
      drawingContext.beginPath();
      drawingContext.roundRect(registryX + 12, chipY, 92, 26, 6);
      drawingContext.stroke();
      drawingContext.fillStyle =
        result.unmounted && !result.cleanup ? COLORS.bad : tone;
      drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('onNotice', registryX + 30, chipY + 17);
      if (result.unmounted && !result.cleanup) {
        drawingContext.fillStyle = COLORS.bad;
        drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText('← 残留', registryX + 112, chipY + 17);
      }
    } else {
      drawingContext.fillStyle = COLORS.faint;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('（空）', registryX + 12, chipY + 17);
    }

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    const dispatchLines = [
      `分发命中：${result.received} 次 → setState`,
      `落空丢弃：${result.dropped} 条`,
      `幽灵触发：${result.ghost} 次`,
    ];
    dispatchLines.forEach((line, index) => {
      drawingContext.fillText(line, registryX + 12, top + 132 + index * 17);
    });

    // 面板三：主进程——只管发送，不感知组件生死
    const bunX = registryX + boxWidth + gap;
    drawPanel(bunX, top, boxWidth, boxHeight, '主进程（src/bun）', null);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(
      'win.webview.rpc.send.pushNotice({ text })',
      boxWidth - 24,
      drawingContext,
    ).forEach((line, index) => {
      drawingContext.fillText(line, bunX + 12, top + 48 + index * 15);
    });

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `已推送：${2 + result.lateMessages} 条`,
      bunX + 12,
      top + 92,
    );
    drawingContext.fillText('（挂载期 2 + 追加 ' + result.lateMessages + '）', bunX + 12, top + 110);
    drawingContext.fillStyle = COLORS.faint;
    wrapText(
      '主进程只对 webview 发送，不知道视图里组件是否还挂载',
      boxWidth - 24,
      drawingContext,
    ).forEach((line, index) => {
      drawingContext.fillText(line, bunX + 12, top + 138 + index * 15);
    });

    drawArrow(margin + boxWidth + 4, registryX - 4, top + boxHeight / 2);
    drawArrow(registryX + boxWidth + 4, bunX - 4, top + boxHeight / 2);

    // 事件时序：四个步骤逐步判定
    const timelineY = top + boxHeight + 20;
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('生命周期时序', margin, timelineY);

    result.steps.forEach((step, index) => {
      const stepY = timelineY + 20 + index * 34;
      const statusColor =
        step.status === 'bad'
          ? COLORS.bad
          : step.status === 'hit'
            ? tone
            : step.status === 'faint'
              ? COLORS.warn
              : COLORS.faint;
      const statusText =
        step.status === 'hit'
          ? '✓'
          : step.status === 'bad'
            ? '✗'
            : step.status === 'faint'
              ? '—'
              : '— 跳过';

      drawingContext.fillStyle = statusColor;
      drawingContext.font =
        '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`${step.label}  ${statusText}`, margin, stepY);
      drawingContext.fillStyle =
        step.status === 'skip' ? COLORS.faint : COLORS.muted;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      wrapText(step.detail, width - margin * 2, drawingContext).forEach(
        (line, lineIndex) => {
          drawingContext.fillText(line, margin, stepY + 17 + lineIndex * 14);
        },
      );
    });

    // 底部结论
    const bottomY = timelineY + 20 + 4 * 34 + 10;
    let summary: string;
    if (!result.unmounted) {
      summary =
        '订阅闭环：挂载注册 → 消息驱动 setState → 界面更新；卸载时清理函数决定后续行为';
    } else if (result.cleanup) {
      summary =
        '正确清理：卸载即 removeMessageListener，后续消息落空，组件安静离场';
    } else if (result.ghost > 0) {
      summary =
        '遗漏清理：listener 残留，主进程继续推送 → 幽灵 setState 打到已卸载组件';
    } else {
      summary =
        '遗漏清理：listener 已残留，暂无追加消息所以尚未爆发——隐患仍在注册表里';
    }
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    wrapText(summary, width - margin * 2, drawingContext).forEach(
      (line, index) => {
        drawingContext.fillText(line, margin, bottomY + index * 17);
      },
    );

    emit({
      componentState: result.unmounted ? '已卸载' : '挂载',
      listeners: `${result.listeners} 个 onNotice`,
      received: `${result.received} 条`,
      ghostUpdates: result.ghost > 0 ? `${result.ghost} 次` : '无',
      warning:
        result.ghost > 0
          ? `对已卸载组件 setState ×${result.ghost}`
          : result.unmounted && !result.cleanup
            ? 'listener 泄漏（未爆发）'
            : '无',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
