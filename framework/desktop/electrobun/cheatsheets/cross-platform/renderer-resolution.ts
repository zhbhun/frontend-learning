/**
 * 演示内容：一个窗口最终跑在哪个渲染引擎上，由构建期与运行期的输入共同决定。
 * 判定链：平台段 bundleCEF 决定 availableRenderers → 窗口 renderer 指定（未指定取
 *   平台段 defaultRenderer，兜底 native）→ 有效性（cef 仅在已捆绑时可用）→
 *   Linux 混用检查（捆绑后所有 webview 必须统一 renderer）。
 * 输入：目标平台、三平台各自的 bundleCEF 开关、该平台的 defaultRenderer、窗口 renderer 指定。
 * 操作：在 Controls 中切换平台、开关各平台 bundleCEF、切换 defaultRenderer 与窗口指定。
 * 预期结果：mac 未捆绑时指定 cef 被判无效；win 捆绑但窗口走 native 时体积照付 ~100MB；
 *   linux 捆绑后窗口指定与 defaultRenderer 不一致触发混用警告；linux 未捆绑时提示
 *   WebKitGTK 的能力缺口。
 * 阅读主线：resolveResolution() 是唯一判定逻辑（引擎映射、体积量级、平台提示都在内），
 *   draw() 只负责把结果画出来。体积为官方文档概数（~14MB / ~100MB 自解压 bundle），
 *   真实产物体积以构建结果为准。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PlatformKey = 'mac' | 'win' | 'linux';
export type RendererChoice = 'native' | 'cef';
export type WindowRendererChoice = 'default' | RendererChoice;

export interface RendererResolutionOptions {
  platform: PlatformKey;
  bundleCEFMac: boolean;
  bundleCEFWin: boolean;
  bundleCEFLinux: boolean;
  defaultRenderer: RendererChoice;
  windowRenderer: WindowRendererChoice;
}

export interface RendererResolutionSnapshot {
  platform: string;
  bundleCEF: string;
  windowRenderer: string;
  availableRenderers: string;
  backend: string;
  bundleSize: string;
  note: string;
}

export interface RendererResolutionInstance {
  update(options: RendererResolutionOptions): void;
  dispose(): void;
}

// 引擎与提示取自官方文档（Compatibility / Cross-Platform / Bundling CEF 三页）
const PLATFORM_LABELS: Record<PlatformKey, string> = {
  mac: 'mac（macOS）',
  win: 'win（Windows）',
  linux: 'linux（Linux）',
};

const SYSTEM_ENGINES: Record<PlatformKey, string> = {
  mac: 'WebKit（WKWebView）',
  win: 'WebView2（Edge 内核）',
  linux: 'WebKitGTK',
};

const PLATFORM_NOTES: Record<PlatformKey, Record<boolean, string>> = {
  mac: {
    true: 'CEF 与系统 WebKit 可按窗口混用',
    false: 'WKWebView 随 macOS 系统更新',
  },
  win: {
    true: 'CEF 版本随你的发布锁定，不随用户系统漂移',
    false: 'WebView2 由系统托管更新：省体积，但用户机器上的版本会漂移',
  },
  linux: {
    true: '官方建议 Linux 发行版统一用 renderer="cef"（纯 X11 窗口）',
    false: 'WebKitGTK：部分发行版未预装，且不支持高级层级 / 遮罩功能',
  },
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

type VerdictTone = 'ok' | 'warn' | 'bad';
type StepStatus = 'ok' | 'bad' | 'skip';

interface StepState {
  label: string;
  status: StepStatus;
  detail: string;
}

interface ResolutionResult {
  platformLabel: string;
  bundled: boolean;
  availableRenderers: string[];
  effectiveChoice: RendererChoice;
  windowSpecLabel: string;
  steps: StepState[];
  backendLabel: string;
  sizeLabel: string;
  noteLines: string[];
  tone: VerdictTone;
}

function resolveResolution(
  options: RendererResolutionOptions,
): ResolutionResult {
  const bundleByPlatform: Record<PlatformKey, boolean> = {
    mac: options.bundleCEFMac,
    win: options.bundleCEFWin,
    linux: options.bundleCEFLinux,
  };
  const bundled = bundleByPlatform[options.platform];
  const availableRenderers: RendererChoice[] = bundled
    ? ['native', 'cef']
    : ['native'];

  const effectiveChoice: RendererChoice =
    options.windowRenderer === 'default'
      ? options.defaultRenderer
      : options.windowRenderer;
  const windowSpecLabel =
    options.windowRenderer === 'default'
      ? `未指定 → defaultRenderer（${options.defaultRenderer}）`
      : `显式指定 ${options.windowRenderer}`;

  const valid = availableRenderers.includes(effectiveChoice);

  // 第四步：Linux 混用检查（官方限制：捆绑后两份二进制，renderer 必须统一）
  let mixingStatus: StepStatus = 'skip';
  let mixingDetail = '仅 Linux 限制混用';
  if (options.platform === 'linux') {
    if (!bundled) {
      mixingStatus = 'skip';
      mixingDetail = '未捆绑 CEF，无混用可能';
    } else if (
      options.windowRenderer !== 'default' &&
      options.windowRenderer !== options.defaultRenderer
    ) {
      mixingStatus = 'bad';
      mixingDetail = '指定与 defaultRenderer 不一致';
    } else {
      mixingStatus = 'ok';
      mixingDetail = '与 defaultRenderer 统一';
    }
  }

  const steps: StepState[] = [
    {
      label: '构建判定 availableRenderers',
      status: 'ok',
      detail: bundled ? '["native","cef"]（CEF 已进包）' : '["native"]（未捆绑）',
    },
    { label: '窗口 renderer 指定', status: 'ok', detail: windowSpecLabel },
    {
      label: '有效性检查',
      status: valid ? 'ok' : 'bad',
      detail: valid
        ? `${effectiveChoice} 在 availableRenderers 中`
        : 'cef 不在 availableRenderers（构建未捆绑 CEF）',
    },
    { label: 'Linux 混用检查', status: mixingStatus, detail: mixingDetail },
  ];

  const invalid = !valid;
  const mixingViolation = mixingStatus === 'bad';
  const backendLabel = invalid
    ? '拿不到 CEF 后端'
    : effectiveChoice === 'cef'
      ? 'CEF（Chromium，随包分发）'
      : SYSTEM_ENGINES[options.platform];

  const sizeLabel = bundled ? '约 100MB（含 CEF）' : '约 14MB（系统引擎）';

  const noteLines: string[] = [PLATFORM_NOTES[options.platform][bundled]];
  if (invalid) {
    noteLines.push('先开对应平台的 bundleCEF 再构建，或改用 native');
  }
  if (mixingViolation) {
    noteLines.push('把 defaultRenderer 与窗口 renderer 统一');
  }
  if (bundled && !invalid && effectiveChoice === 'native') {
    noteLines.push('CEF 已进包但未被使用——体积照付');
  }

  const tone: VerdictTone =
    invalid || mixingViolation
      ? 'bad'
      : options.platform === 'linux' && !bundled
        ? 'warn'
        : 'ok';

  return {
    platformLabel: PLATFORM_LABELS[options.platform],
    bundled,
    availableRenderers,
    effectiveChoice,
    windowSpecLabel,
    steps,
    backendLabel,
    sizeLabel,
    noteLines,
    tone,
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

function toneColor(tone: VerdictTone): string {
  if (tone === 'ok') {
    return COLORS.ok;
  }
  return tone === 'warn' ? COLORS.warn : COLORS.bad;
}

export function createRendererResolution(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RendererResolutionSnapshot) => void,
): RendererResolutionInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: RendererResolutionOptions = {
    platform: 'mac',
    bundleCEFMac: false,
    bundleCEFWin: true,
    bundleCEFLinux: true,
    defaultRenderer: 'native',
    windowRenderer: 'default',
  };

  function drawPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    tone: VerdictTone | null,
  ) {
    const borderColor =
      tone === null
        ? COLORS.plainBorder
        : tone === 'ok'
          ? COLORS.ok
          : tone === 'warn'
            ? COLORS.warn
            : COLORS.bad;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = borderColor;
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

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, fromX + 2, y - 8);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(380, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const options = current;
    const bundleByPlatform: Record<PlatformKey, boolean> = {
      mac: options.bundleCEFMac,
      win: options.bundleCEFWin,
      linux: options.bundleCEFLinux,
    };
    const result = resolveResolution(options);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('renderer 选定链', 24, 38);

    const margin = 24;
    const top = 74;
    const gap = Math.max(24, Math.min(40, width * 0.05));
    const boxWidth = (width - margin * 2 - gap * 2) / 3;
    const boxHeight = 232;

    // 面板一：构建配置
    drawPanel(margin, top, boxWidth, boxHeight, '构建配置（当前平台）', null);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    const configRows = [
      `平台：${result.platformLabel}`,
      `bundleCEF：${result.bundled ? 'true（CEF 进包）' : 'false'}`,
      `defaultRenderer：${options.defaultRenderer}`,
    ];
    configRows.forEach((row, index) => {
      drawingContext.fillText(row, margin + 12, top + 50 + index * 20);
    });
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const overview = `三平台开关：mac ${options.bundleCEFMac ? '✓' : '✗'} · win ${
      options.bundleCEFWin ? '✓' : '✗'
    } · linux ${options.bundleCEFLinux ? '✓' : '✗'}`;
    wrapText(overview, boxWidth - 24, drawingContext).forEach(
      (line, lineIndex) => {
        drawingContext.fillText(line, margin + 12, top + 118 + lineIndex * 15);
      },
    );
    drawingContext.fillStyle = COLORS.faint;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    wrapText('系统引擎：' + SYSTEM_ENGINES[options.platform], boxWidth - 24, drawingContext).forEach(
      (line, lineIndex) => {
        drawingContext.fillText(line, margin + 12, top + 152 + lineIndex * 15);
      },
    );
    wrapText('官方平衡示例：mac 关、win / linux 开', boxWidth - 24, drawingContext).forEach(
      (line, lineIndex) => {
        drawingContext.fillText(line, margin + 12, top + 182 + lineIndex * 15);
      },
    );

    // 面板二：判定链
    const stepX = margin + boxWidth + gap;
    drawPanel(stepX, top, boxWidth, boxHeight, '判定链（顺序执行）', null);
    const stepOrder = ['①', '②', '③', '④'];
    result.steps.forEach((step, index) => {
      const stepY = top + 46 + index * 46;
      const nameColor =
        step.status === 'skip'
          ? COLORS.faint
          : step.status === 'bad'
            ? COLORS.bad
            : COLORS.muted;
      const statusText =
        step.status === 'ok'
          ? '✓'
          : step.status === 'bad'
            ? '✗'
            : '— 不适用';

      drawingContext.fillStyle = nameColor;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        `${stepOrder[index]} ${step.label}  ${statusText}`,
        stepX + 12,
        stepY,
      );
      drawingContext.fillStyle =
        step.status === 'skip' ? COLORS.faint : COLORS.muted;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(step.detail, boxWidth - 24, drawingContext).forEach(
        (line, lineIndex) => {
          drawingContext.fillText(line, stepX + 12, stepY + 17 + lineIndex * 14);
        },
      );
    });

    // 面板三：结果
    const resultX = stepX + boxWidth + gap;
    drawPanel(resultX, top, boxWidth, boxHeight, '结果', result.tone);
    drawingContext.fillStyle = toneColor(result.tone);
    drawingContext.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(result.backendLabel, resultX + 12, top + 48);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(`初始 bundle：${result.sizeLabel}`, resultX + 12, top + 76);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    let noteY = top + 104;
    result.noteLines.forEach((line) => {
      wrapText(line, boxWidth - 24, drawingContext).forEach(
        (wrapped, wrappedIndex) => {
          drawingContext.fillText(wrapped, resultX + 12, noteY);
          noteY += 17;
        },
      );
    });

    // 箭头连接三个面板
    const arrowY = top + boxHeight / 2;
    drawArrow(margin + boxWidth + 4, stepX - 4, arrowY, '逐项判定');
    drawArrow(stepX + boxWidth + 4, resultX - 4, arrowY, '');

    // 底部展示本次判定所依据的配置形态
    const bottomY = top + boxHeight + 34;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const switches = (['mac', 'win', 'linux'] as PlatformKey[])
      .map((key) => `${key}.bundleCEF=${bundleByPlatform[key]}`)
      .join(' · ');
    drawingContext.fillText(switches, margin, bottomY);
    drawingContext.fillText(
      `defaultRenderer=${options.defaultRenderer} · 窗口 renderer=${
        options.windowRenderer === 'default' ? '（未指定）' : options.windowRenderer
      } · availableRenderers=["${result.availableRenderers.join('","')}"]`,
      margin,
      bottomY + 18,
    );

    emit({
      platform: result.platformLabel,
      bundleCEF: String(result.bundled),
      windowRenderer:
        options.windowRenderer === 'default'
          ? `未指定（→ ${result.effectiveChoice}）`
          : options.windowRenderer,
      availableRenderers: `["${result.availableRenderers.join('","')}"]`,
      backend: result.backendLabel,
      bundleSize: result.sizeLabel,
      note: result.noteLines.join('；'),
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
