/**
 * 演示内容：Vite 集成下主进程如何决定窗口加载哪个 URL——第一步判运行通道
 * （Updater.localInfo.channel()，读应用包 version.json），只有 dev 通道才会
 * fetch HEAD 探活 Vite dev server；探活通过则窗口直连 localhost 获得热更新，
 * 不通回退 copy 装配的打包产物；canary / stable 产物连探测都不做，必然走
 * views://。
 * 输入：运行通道（dev / canary / stable）、Vite dev server 是否在 5173 运行。
 * 操作：在 Controls 中切换通道与 dev server 状态。
 * 预期结果：dev + server 运行 → http://localhost:5173，日志 HMR enabled；
 *   dev + server 未启动 → views://mainview/index.html，日志提示 bun run dev:hmr；
 *   canary / stable → 跳过探活，直接 views://mainview/index.html。
 * 阅读主线：resolveDecision() 是唯一决策逻辑（步骤与 vite-tester 的
 *   getMainViewUrl 同序），draw() 只负责把结果画出来；日志文案取自
 *   vite-tester 实测输出。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RunChannel = 'dev' | 'canary' | 'stable';

export interface UrlDecisionOptions {
  channel: RunChannel;
  devServer: boolean;
}

export interface UrlDecisionSnapshot {
  channel: string;
  devServer: string;
  url: string;
  log: string;
}

export interface UrlDecisionInstance {
  update(options: UrlDecisionOptions): void;
  dispose(): void;
}

type StepStatus = 'hit' | 'miss' | 'skip';
type DecisionMode = 'hmr' | 'fallback' | 'bundled';

interface DecisionStep {
  label: string;
  status: StepStatus;
  detail: string;
}

interface DecisionResult {
  channel: RunChannel;
  devServer: boolean;
  steps: DecisionStep[];
  url: string;
  logLines: string[];
  mode: DecisionMode;
}

const DEV_SERVER_URL = 'http://localhost:5173';
const BUNDLED_URL = 'views://mainview/index.html';

const CHANNEL_LABELS: Record<RunChannel, string> = {
  dev: 'dev（electrobun dev / build --env=dev）',
  canary: 'canary（build --env=canary）',
  stable: 'stable（build --env=stable）',
};

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

// 与 vite-tester 的 getMainViewUrl 同序：先通道、后探活、再选 URL
function resolveDecision(options: UrlDecisionOptions): DecisionResult {
  const isDev = options.channel === 'dev';
  const step1: DecisionStep = {
    label: '① channel === "dev"',
    status: isDev ? 'hit' : 'miss',
    detail: isDev
      ? 'version.json 的 channel 为 dev'
      : `${options.channel} 产物，跳过 dev server 逻辑`,
  };
  const base = { channel: options.channel, devServer: options.devServer };

  if (!isDev) {
    return {
      ...base,
      steps: [
        step1,
        { label: '② fetch HEAD :5173', status: 'skip', detail: '未到达' },
        { label: '③ 选择加载 URL', status: 'hit', detail: '直接打包视图' },
      ],
      url: BUNDLED_URL,
      logLines: ['（无 dev server 探测日志，直接启动）'],
      mode: 'bundled',
    };
  }

  const alive = options.devServer;
  const step2: DecisionStep = {
    label: '② fetch HEAD :5173',
    status: alive ? 'hit' : 'miss',
    detail: alive ? '200 OK' : '连接失败（未启动 / 端口被占）',
  };

  if (alive) {
    return {
      ...base,
      steps: [
        step1,
        step2,
        { label: '③ 选择加载 URL', status: 'hit', detail: '直连 dev server' },
      ],
      url: DEV_SERVER_URL,
      logLines: [`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`],
      mode: 'hmr',
    };
  }

  return {
    ...base,
    steps: [
      step1,
      step2,
      { label: '③ 选择加载 URL', status: 'hit', detail: '回退打包产物' },
    ],
    url: BUNDLED_URL,
    logLines: [
      "Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
    ],
    mode: 'fallback',
  };
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

function modeColor(mode: DecisionMode): string {
  if (mode === 'hmr') {
    return COLORS.ok;
  }
  return mode === 'fallback' ? COLORS.warn : COLORS.muted;
}

export function createUrlDecision(
  canvas: HTMLCanvasElement,
  emit: (snapshot: UrlDecisionSnapshot) => void,
): UrlDecisionInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: UrlDecisionOptions = { channel: 'dev', devServer: true };

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

  function drawArrow(fromX: number, toX: number, y: number, label: string) {
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

    if (label) {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(label, fromX + 2, y - 8);
    }
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const decision = resolveDecision(current);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('窗口加载哪个 URL？', 24, 38);

    const margin = 24;
    const top = 74;
    const gap = Math.max(20, Math.min(40, width * 0.05));
    const boxWidth = (width - margin * 2 - gap * 2) / 3;
    const boxHeight = 190;

    // 面板一：运行环境（决策的两个输入）
    drawPanel(margin, top, boxWidth, boxHeight, '运行环境', null);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('运行通道', margin + 12, top + 46);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    wrapText(
      CHANNEL_LABELS[decision.channel],
      boxWidth - 24,
      drawingContext,
    ).forEach((line, index) => {
      drawingContext.fillText(line, margin + 12, top + 64 + index * 16);
    });
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('Vite dev server :5173', margin + 12, top + 108);
    drawingContext.fillStyle = decision.devServer ? COLORS.ok : COLORS.bad;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      decision.devServer ? '运行中' : '未启动',
      margin + 12,
      top + 126,
    );
    drawingContext.fillStyle = COLORS.faint;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText('bun run dev:hmr 的 [0]', margin + 12, top + 146);
    drawingContext.fillText('concurrently 进程', margin + 12, top + 162);

    // 面板二：主进程决策链，逐步判定
    const chainX = margin + boxWidth + gap;
    drawPanel(chainX, top, boxWidth, boxHeight, '主进程决策链（src/bun）', null);
    decision.steps.forEach((step, index) => {
      const stepY = top + 48 + index * 46;
      const nameColor =
        step.status === 'skip'
          ? COLORS.faint
          : step.status === 'hit'
            ? modeColor(decision.mode)
            : COLORS.muted;
      const statusText =
        step.status === 'hit'
          ? '✓'
          : step.status === 'miss'
            ? '✗ 否'
            : '— 跳过';

      drawingContext.fillStyle = nameColor;
      drawingContext.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(`${step.label}  ${statusText}`, chainX + 12, stepY);
      drawingContext.fillStyle =
        step.status === 'skip' ? COLORS.faint : COLORS.muted;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      wrapText(step.detail, boxWidth - 24, drawingContext).forEach(
        (line, lineIndex) => {
          drawingContext.fillText(line, chainX + 12, stepY + 17 + lineIndex * 14);
        },
      );
    });

    // 面板三：窗口与主进程日志（决策结果）
    const resultX = chainX + boxWidth + gap;
    drawPanel(resultX, top, boxWidth, boxHeight, '窗口与主进程日志', modeColor(decision.mode));

    // 窗口框：标题栏 + 地址栏
    const winX = resultX + 12;
    const winY = top + 38;
    const winW = boxWidth - 24;
    drawingContext.fillStyle = '#f1f5f9';
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(winX, winY, winW, 58, 6);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(winX, winY + 20);
    drawingContext.lineTo(winX + winW, winY + 20);
    drawingContext.stroke();
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('BrowserWindow · url', winX + 8, winY + 14);
    drawingContext.fillStyle = modeColor(decision.mode);
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    wrapText(decision.url, winW - 16, drawingContext).forEach(
      (line, index) => {
        drawingContext.fillText(line, winX + 8, winY + 38 + index * 14);
      },
    );

    // 主进程日志
    let logY = winY + 80;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('console.log', resultX + 12, logY);
    logY += 18;
    decision.logLines.forEach((line) => {
      drawingContext.fillStyle =
        decision.mode === 'hmr'
          ? COLORS.ok
          : decision.mode === 'fallback'
            ? COLORS.warn
            : COLORS.faint;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(line, boxWidth - 24, drawingContext).forEach(
        (wrapped, wrappedIndex) => {
          drawingContext.fillText(wrapped, resultX + 12, logY);
          logY += 14;
        },
      );
      logY += 4;
    });

    // 箭头连接三个面板
    const arrowY = top + boxHeight / 2;
    drawArrow(margin + boxWidth + 4, chainX - 4, arrowY, '');
    drawArrow(chainX + boxWidth + 4, resultX - 4, arrowY, '');

    // 底部：结果一句话
    const bottomY = top + boxHeight + 34;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    const summary =
      decision.mode === 'hmr'
        ? '窗口直连 dev server：改 src/mainview 下的模块，Vite 推送更新，页面即时变化'
        : decision.mode === 'fallback'
          ? '回退打包产物：视图改动不再生效，需要 bun run dev:hmr 才有热更新'
          : '分发产物不探测 localhost：永远加载 copy 装配的 views:// 打包视图';
    wrapText(summary, width - margin * 2, drawingContext).forEach(
      (line, index) => {
        drawingContext.fillText(line, margin, bottomY + index * 17);
      },
    );

    emit({
      channel: CHANNEL_LABELS[decision.channel],
      devServer: decision.devServer ? '运行中 (:5173)' : '未启动',
      url: decision.url,
      log: decision.logLines.join(' '),
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
