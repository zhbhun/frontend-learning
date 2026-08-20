/**
 * 演示内容：electrobun build 时「是否签名、是否公证、用什么凭据公证、在哪里失败」
 * 的完整判定链——通道闸门、codesign 开关、ELECTROBUN_DEVELOPER_ID 身份、公证凭据
 * 三元组，逐道判定、命中即定案。
 * 输入：构建通道（dev / canary / stable）、build.mac.codesign 与 notarize 两个开关、
 *   ELECTROBUN_DEVELOPER_ID 是否已设置、公证凭据形态（无 / Apple ID 三元组 /
 *   App Store Connect API key 三元组）。前提：macOS 主机构建 macOS 目标。
 * 操作：在 Controls 中切换通道、开关签名与公证、拿掉身份或凭据环境变量。
 * 预期结果：默认的 canary + 双开 + Apple ID 场景走完 code signing → notarizing →
 *   stapling 三行日志；切到 dev 通道后无论怎么配置都只打印 skipping codesign；
 *   关掉 ELECTROBUN_DEVELOPER_ID 或选「未设置凭据」则复现两种构建退出错误。
 * 阅读主线：resolveVerdict() 是唯一判定逻辑，按 CLI 源码（src/cli/index.ts 的
 *   shouldCodesign / shouldNotarize / codesignAppBundle / notarizeAndStaple）实现；
 *   draw() 只负责把结论画成终端日志形态。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SignChannel = 'dev' | 'canary' | 'stable';
export type NotaryCredential = 'none' | 'apple-id' | 'api-key';

export interface SignVerdictOptions {
  channel: SignChannel;
  codesign: boolean;
  notarize: boolean;
  hasDeveloperId: boolean;
  credentials: NotaryCredential;
}

export interface SignVerdictSnapshot {
  channel: string;
  shouldCodesign: string;
  shouldNotarize: string;
  verdict: string;
  reason: string;
}

export interface SignVerdictInstance {
  update(options: SignVerdictOptions): void;
  dispose(): void;
}

const CREDENTIAL_LABEL: Record<NotaryCredential, string> = {
  none: '未设置',
  'apple-id': 'Apple ID 三元组',
  'api-key': 'App Store Connect API key',
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

type VerdictTone = 'signed' | 'skipped' | 'failed';
type GateStatus = 'pass' | 'fail' | 'skip';

interface GateState {
  label: string;
  status: GateStatus;
  detail: string;
}

interface LogLine {
  text: string;
  tone: 'ok' | 'skip' | 'bad' | 'muted';
  indent?: boolean;
}

interface VerdictResult {
  channelLabel: string;
  configSummary: string;
  envSummary: string;
  gates: GateState[];
  logLines: LogLine[];
  verdictLabel: string;
  reason: string;
  tone: VerdictTone;
}

// 判定逻辑与 CLI 源码逐行对应：
//   shouldCodesign = buildEnvironment !== "dev" && targetOS === "macos"
//                     && OS === "macos" && config.build.mac.codesign
//   shouldNotarize = shouldCodesign && config.build.mac.notarize
// 本示意图固定为 macOS 主机 × macOS 目标，因此只剩通道与配置两道条件。
function resolveVerdict(options: SignVerdictOptions): VerdictResult {
  const base = {
    channelLabel: `--env=${options.channel}`,
    configSummary: `codesign: ${options.codesign} · notarize: ${options.notarize}`,
    envSummary: `ELECTROBUN_DEVELOPER_ID ${
      options.hasDeveloperId ? '已设置' : '未设置'
    } · 公证凭据：${CREDENTIAL_LABEL[options.credentials]}`,
  };

  // 闸门一：dev 通道强制跳过，配置无效
  if (options.channel === 'dev') {
    return {
      ...base,
      gates: [
        { label: '通道闸门', status: 'fail', detail: 'dev 通道，强制跳过' },
        { label: 'codesign 开关', status: 'skip', detail: '未评估' },
        { label: '签名身份', status: 'skip', detail: '未评估' },
        { label: '公证凭据', status: 'skip', detail: '未评估' },
      ],
      logLines: [
        { text: 'skipping codesign', tone: 'skip' },
        { text: 'skipping notarization', tone: 'skip' },
        { text: '（dev 通道为迭代速度服务，永不签名）', tone: 'muted' },
      ],
      verdictLabel: '跳过签名',
      reason: 'dev 通道强制跳过；要验证签名用 --env=canary',
      tone: 'skipped',
    };
  }

  // 闸门二：codesign 开关未打开
  if (!options.codesign) {
    return {
      ...base,
      gates: [
        {
          label: '通道闸门',
          status: 'pass',
          detail: `${options.channel} 通道，允许签名`,
        },
        { label: 'codesign 开关', status: 'fail', detail: 'build.mac.codesign 未开启' },
        { label: '签名身份', status: 'skip', detail: '未评估' },
        { label: '公证凭据', status: 'skip', detail: '未评估' },
      ],
      logLines: [
        { text: 'skipping codesign', tone: 'skip' },
        ...(options.notarize
          ? [
              {
                text: 'skipping notarization',
                tone: 'skip',
              },
              {
                text: '（notarize 依赖 codesign，单独开启被忽略）',
                tone: 'muted',
              },
            ]
          : [{ text: 'skipping notarization', tone: 'skip' }]),
      ],
      verdictLabel: '未签名构建',
      reason: 'codesign: false；notarize 也不会发生',
      tone: 'skipped',
    };
  }

  // 闸门三：签名身份环境变量（缺失即构建退出）
  if (!options.hasDeveloperId) {
    return {
      ...base,
      gates: [
        {
          label: '通道闸门',
          status: 'pass',
          detail: `${options.channel} 通道，允许签名`,
        },
        { label: 'codesign 开关', status: 'pass', detail: 'build.mac.codesign: true' },
        {
          label: '签名身份',
          status: 'fail',
          detail: 'ELECTROBUN_DEVELOPER_ID 未设置',
        },
        { label: '公证凭据', status: 'skip', detail: '未评估' },
      ],
      logLines: [
        { text: 'code signing...', tone: 'ok' },
        {
          text: 'Env var ELECTROBUN_DEVELOPER_ID is required to codesign',
          tone: 'bad',
        },
        { text: '（构建退出，exit 1）', tone: 'muted' },
      ],
      verdictLabel: '构建失败',
      reason: '缺 ELECTROBUN_DEVELOPER_ID，签名身份无法确定',
      tone: 'failed',
    };
  }

  const shouldNotarize = options.notarize;

  // 只签名、不公证
  if (!shouldNotarize) {
    return {
      ...base,
      gates: [
        {
          label: '通道闸门',
          status: 'pass',
          detail: `${options.channel} 通道，允许签名`,
        },
        { label: 'codesign 开关', status: 'pass', detail: 'build.mac.codesign: true' },
        {
          label: '签名身份',
          status: 'pass',
          detail: 'ELECTROBUN_DEVELOPER_ID 已设置',
        },
        { label: '公证凭据', status: 'skip', detail: 'notarize 未开启' },
      ],
      logLines: [
        { text: 'code signing...', tone: 'ok' },
        { text: 'skipping notarization', tone: 'skip' },
      ],
      verdictLabel: '仅签名',
      reason: '签名完成，跳过公证（分发仍会被 Gatekeeper 拦）',
      tone: 'signed',
    };
  }

  // 闸门四：公证凭据三元组（两组各需三个变量，缺失即构建退出）
  if (options.credentials === 'none') {
    return {
      ...base,
      gates: [
        {
          label: '通道闸门',
          status: 'pass',
          detail: `${options.channel} 通道，允许签名`,
        },
        { label: 'codesign 开关', status: 'pass', detail: 'build.mac.codesign: true' },
        {
          label: '签名身份',
          status: 'pass',
          detail: 'ELECTROBUN_DEVELOPER_ID 已设置',
        },
        { label: '公证凭据', status: 'fail', detail: '两组三元组均未凑齐' },
      ],
      logLines: [
        { text: 'code signing...', tone: 'ok' },
        { text: 'notarizing...', tone: 'ok' },
        {
          text: 'Provide either App Store Connect API key credentials (…)',
          tone: 'bad',
        },
        { text: 'or Apple ID credentials (…) to notarize', tone: 'bad' },
        {
          text: '（完整报错列出两组各三个变量名；构建退出，exit 1）',
          tone: 'muted',
        },
      ],
      verdictLabel: '构建失败',
      reason: '公证凭据不齐全：两组三元组各需三个环境变量',
      tone: 'failed',
    };
  }

  const submitLine =
    options.credentials === 'api-key'
      ? 'xcrun notarytool submit --key …p8 --key-id … --issuer … --wait'
      : 'xcrun notarytool submit --apple-id … --password … --team-id … --wait';

  return {
    ...base,
    gates: [
      {
        label: '通道闸门',
        status: 'pass',
        detail: `${options.channel} 通道，允许签名`,
      },
      { label: 'codesign 开关', status: 'pass', detail: 'build.mac.codesign: true' },
      {
        label: '签名身份',
        status: 'pass',
        detail: 'ELECTROBUN_DEVELOPER_ID 已设置',
      },
      {
        label: '公证凭据',
        status: 'pass',
        detail: CREDENTIAL_LABEL[options.credentials],
      },
    ],
    logLines: [
      { text: 'code signing...', tone: 'ok' },
      { text: 'notarizing...', tone: 'ok' },
      { text: submitLine, tone: 'muted', indent: true },
      { text: 'stapling...', tone: 'ok' },
    ],
    verdictLabel: '签名 + 公证',
    reason: `签名、公证并 staple，凭据走${CREDENTIAL_LABEL[options.credentials]}`,
    tone: 'signed',
  };
}

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

export function createSignVerdict(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SignVerdictSnapshot) => void,
): SignVerdictInstance {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }

  const drawingContext: CanvasRenderingContext2D = context;

  let current: SignVerdictOptions = {
    channel: 'canary',
    codesign: true,
    notarize: true,
    hasDeveloperId: true,
    credentials: 'apple-id',
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
        : tone === 'signed'
          ? COLORS.ok
          : tone === 'skipped'
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
    const width = Math.max(360, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const verdict = resolveVerdict(current);

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('签名与公证判定（macOS 主机 × macOS 目标）', 24, 38);

    const margin = 24;
    const top = 74;
    const gap = Math.max(24, Math.min(40, width * 0.05));
    const boxWidth = (width - margin * 2 - gap * 2) / 3;
    const boxHeight = 232;

    // 面板一：构建输入
    drawPanel(margin, top, boxWidth, boxHeight, '构建输入', null);
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    let inputY = top + 50;
    [verdict.channelLabel, verdict.configSummary].forEach((line) => {
      wrapText(line, boxWidth - 24, drawingContext).forEach((wrapped) => {
        drawingContext.fillText(wrapped, margin + 12, inputY);
        inputY += 17;
      });
    });
    drawingContext.fillStyle = COLORS.muted;
    wrapText(verdict.envSummary, boxWidth - 24, drawingContext).forEach(
      (wrapped) => {
        drawingContext.fillText(wrapped, margin + 12, inputY + 4);
        inputY += 17;
      },
    );

    // 面板二：四道闸门，逐道判定
    const gateX = margin + boxWidth + gap;
    drawPanel(gateX, top, boxWidth, boxHeight, '四道闸门（逐道判定）', null);
    const gateOrder = ['①', '②', '③', '④'];
    verdict.gates.forEach((gate, index) => {
      const gateY = top + 46 + index * 37;
      const nameColor =
        gate.status === 'skip'
          ? COLORS.faint
          : gate.status === 'fail'
            ? COLORS.bad
            : COLORS.ok;

      const statusText =
        gate.status === 'pass' ? '✓ 通过' : gate.status === 'fail' ? '✗ 拦下' : '— 未评估';

      drawingContext.fillStyle = nameColor;
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        `${gateOrder[index]} ${gate.label}  ${statusText}`,
        gateX + 12,
        gateY,
      );
      drawingContext.fillStyle =
        gate.status === 'skip' ? COLORS.faint : COLORS.muted;
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      wrapText(gate.detail, boxWidth - 24, drawingContext).forEach(
        (line, lineIndex) => {
          drawingContext.fillText(line, gateX + 12, gateY + 16 + lineIndex * 14);
        },
      );
    });

    // 面板三：构建终端日志与结论
    const resultX = gateX + boxWidth + gap;
    drawPanel(resultX, top, boxWidth, boxHeight, '构建终端（结论）', verdict.tone);
    drawingContext.fillStyle =
      verdict.tone === 'signed'
        ? COLORS.ok
        : verdict.tone === 'skipped'
          ? COLORS.warn
          : COLORS.bad;
    drawingContext.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(verdict.verdictLabel, resultX + 12, top + 46);

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    let logY = top + 70;
    verdict.logLines.forEach((line) => {
      const color =
        line.tone === 'ok'
          ? COLORS.ok
          : line.tone === 'bad'
            ? COLORS.bad
            : line.tone === 'skip'
              ? COLORS.faint
              : COLORS.muted;
      drawingContext.fillStyle = color;
      const x = resultX + 12 + (line.indent ? 10 : 0);
      wrapText(line.text, boxWidth - 24 - (line.indent ? 10 : 0), drawingContext).forEach(
        (wrapped) => {
          drawingContext.fillText(wrapped, x, logY);
          logY += 15;
        },
      );
    });

    const arrowY = top + boxHeight / 2;
    drawArrow(margin + boxWidth + 4, gateX - 4, arrowY, '逐道判定');
    drawArrow(gateX + boxWidth + 4, resultX - 4, arrowY, '');

    // 底部补充判定依据
    const bottomY = top + boxHeight + 34;
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `${verdict.reason}。API key 与 Apple ID 两组同时设置时，CLI 优先使用 API key。`,
      margin,
      bottomY,
    );

    emit({
      channel: verdict.channelLabel,
      shouldCodesign: current.channel !== 'dev' && current.codesign ? 'true' : 'false',
      shouldNotarize:
        current.channel !== 'dev' && current.codesign && current.notarize
          ? 'true'
          : 'false',
      verdict: verdict.verdictLabel,
      reason: verdict.reason,
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
