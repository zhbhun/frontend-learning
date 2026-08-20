/**
 * 演示内容：一次 rpc.request / rpc.send 调用在两端与线上各发生什么——
 * 发起方的代理代码、过线的 JSON 包、接收方的 handler，
 * 以及 handler 抛错与超时两种失败路径的表现。
 * 输入：调用方向（request/send × 视图/主进程发起）与处理结果（仅 request 适用）。
 * 操作：在 Controls 中切换「调用方向」与「处理结果」。
 * 预期结果：request 呈现 request/response 包按 id 配对；send 只有 message 包且无回执；
 * 抛错时 response 包带 success:false 与 error 字段；超时时 response 永不到达
 * （画面上画成断线 ×），调用侧在 maxRequestTime（默认 1000ms）后 reject。
 * 最终的调用侧结果（resolve/reject）显示在画面下方的派生读数里。
 * 阅读主线：resolveScene() 按 wire 协议（electrobun 包内 shared/rpc.ts）生成
 * 场景数据，draw() 只负责把同一份数据画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CallKind = 'view-request' | 'bun-request' | 'view-send' | 'bun-send';
export type CallOutcome = 'ok' | 'handler-error' | 'timeout';

export interface PacketFlowOptions {
  callKind: CallKind;
  outcome: CallOutcome;
}

// 派生读数用短摘要；完整 JSON 包画在画面上
export interface PacketFlowSnapshot {
  direction: string;
  proxyCode: string;
  packet1: string;
  packet2: string;
  result: string;
}

export interface PacketFlowInstance {
  update(options: PacketFlowOptions): void;
  dispose(): void;
}

interface Scene {
  title: string;
  direction: string;
  callerIsView: boolean;
  isRequest: boolean;
  callerCode: string;
  calleeCode: string;
  packet1: string;
  // null 表示该方向没有第二个包（send 单向）
  packet2: string | null;
  // true 表示第二个包永远到不了（超时）
  responseLost: boolean;
  result: string;
  resultBad: boolean;
  note: string;
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  ok: '#4f7cff',
  bad: '#d64545',
  boxFill: '#ffffff',
  arrow: '#64748b',
};

const KIND_LABELS: Record<CallKind, string> = {
  'view-request': '视图 → 主进程（request）',
  'bun-request': '主进程 → 视图（request）',
  'view-send': '视图 → 主进程（send）',
  'bun-send': '主进程 → 视图（send）',
};

// 按 '/'、空格和逗号断行，避免 JSON 包文本超出画布
function wrapText(
  text: string,
  maxWidth: number,
  context: CanvasRenderingContext2D,
): string[] {
  if (context.measureText(text).width <= maxWidth) {
    return [text];
  }

  const tokens = text
    .split(/(?<=\/)|(?<= )|(?<=,)/)
    .filter((token) => token !== '');
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

// wire 协议与结果文案均对照 electrobun 1.18.1 包内 shared/rpc.ts 生成
function resolveScene(options: PacketFlowOptions): Scene {
  const { callKind, outcome } = options;
  const callerIsView = callKind.startsWith('view-');
  const isRequest = callKind.endsWith('request');
  const base = {
    title: `RPC 包流：${KIND_LABELS[callKind]}`,
    direction: KIND_LABELS[callKind],
    callerIsView,
    isRequest,
    responseLost: false,
    note: '',
  };

  const errorMessage = '只传 error.message 字符串，Error 的其余字段不过线';
  const timeoutMessage = 'response 未在 maxRequestTime（默认 1000ms）内到达';

  if (callKind === 'view-request') {
    const packet1 =
      '{"type":"request", "id":1, "method":"addNumbers", "params":{"a":3, "b":4}}';

    if (outcome === 'ok') {
      return {
        ...base,
        callerCode: 'rpc.request.addNumbers({ a: 3, b: 4 })',
        calleeCode: 'handlers.requests.addNumbers',
        packet1,
        packet2: '{"type":"response", "id":1, "success":true, "payload":{"sum":7}}',
        result: 'resolve { sum: 7 }',
        resultBad: false,
      };
    }

    if (outcome === 'handler-error') {
      return {
        ...base,
        callerCode: 'rpc.request.addNumbers({ a: 3, b: 4 })',
        calleeCode: 'handlers.requests.addNumbers（抛 Error("boom")）',
        packet1,
        packet2: '{"type":"response", "id":1, "success":false, "error":"boom"}',
        result: 'reject Error("boom")',
        resultBad: true,
        note: errorMessage,
      };
    }

    return {
      ...base,
      callerCode: 'rpc.request.addNumbers({ a: 3, b: 4 })',
      calleeCode: 'handlers.requests.addNumbers（迟迟不返回）',
      packet1,
      packet2: '{"type":"response", "id":1, "success":true, "payload":{…}}',
      responseLost: true,
      result: 'reject Error("RPC request timed out.")',
      resultBad: true,
      note: timeoutMessage,
    };
  }

  if (callKind === 'bun-request') {
    const packet1 = '{"type":"request", "id":1, "method":"getViewportSize"}';

    if (outcome === 'ok') {
      return {
        ...base,
        callerCode: 'webview.rpc.request.getViewportSize()',
        calleeCode: 'handlers.requests.getViewportSize',
        packet1,
        packet2:
          '{"type":"response", "id":1, "success":true, "payload":{"width":800, "height":600}}',
        result: 'resolve { width: 800, height: 600 }',
        resultBad: false,
      };
    }

    if (outcome === 'handler-error') {
      return {
        ...base,
        callerCode: 'webview.rpc.request.getViewportSize()',
        calleeCode: 'handlers.requests.getViewportSize（抛 Error("boom")）',
        packet1,
        packet2: '{"type":"response", "id":1, "success":false, "error":"boom"}',
        result: 'reject Error("boom")',
        resultBad: true,
        note: errorMessage,
      };
    }

    return {
      ...base,
      callerCode: 'webview.rpc.request.getViewportSize()',
      calleeCode: 'handlers.requests.getViewportSize（迟迟不返回）',
      packet1,
      packet2: '{"type":"response", "id":1, "success":true, "payload":{…}}',
      responseLost: true,
      result: 'reject Error("RPC request timed out.")',
      resultBad: true,
      note: timeoutMessage,
    };
  }

  if (callKind === 'view-send') {
    return {
      ...base,
      callerCode: 'rpc.send.logToBun({ msg: "hi" })',
      calleeCode: 'handlers.messages.logToBun',
      packet1: '{"type":"message", "id":"logToBun", "payload":{"msg":"hi"}}',
      packet2: null,
      result: '立即返回（void），无回执',
      resultBad: false,
      note: 'send 无响应包，处理结果开关不适用',
    };
  }

  return {
    ...base,
    callerCode: 'webview.rpc.send.logToWebview({ msg: "hi" })',
    calleeCode: 'handlers.messages.logToWebview',
    packet1: '{"type":"message", "id":"logToWebview", "payload":{"msg":"hi"}}',
    packet2: null,
    result: '立即返回（void），无回执',
    resultBad: false,
    note: 'send 无响应包，处理结果开关不适用',
  };
}

function shortPacket1(scene: Scene): string {
  if (scene.isRequest) {
    const method = scene.callerIsView ? 'addNumbers' : 'getViewportSize';
    return `request #1 ${method}`;
  }
  const name = scene.callerIsView ? 'logToBun' : 'logToWebview';
  return `message ${name}`;
}

function shortPacket2(scene: Scene): string {
  if (!scene.packet2) {
    return '—（send 无响应）';
  }
  if (scene.responseLost) {
    return 'response 未到达（超时）';
  }
  return scene.packet2.includes('"success":false')
    ? 'response success:false'
    : 'response success:true';
}

export function createRpcPacketFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PacketFlowSnapshot) => void,
): PacketFlowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: PacketFlowOptions = { callKind: 'view-request', outcome: 'ok' };

  function drawTextLines(
    lines: string[],
    x: number,
    bottomY: number,
    lineHeight: number,
  ) {
    lines.forEach((line, index) => {
      drawingContext.fillText(
        line,
        x,
        bottomY - (lines.length - 1 - index) * lineHeight,
      );
    });
  }

  function drawSideBox(
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    isCaller: boolean,
    code: string,
  ) {
    const tone = isCaller ? COLORS.ok : COLORS.plainBorder;

    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = tone;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(name, x + 12, y + 20);
    drawingContext.fillStyle = isCaller ? COLORS.ok : COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(isCaller ? '发起方' : '接收方', x + 12, y + 37);

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const codeLines = wrapText(code, width - 24, drawingContext).slice(0, 3);
    codeLines.forEach((line, index) => {
      drawingContext.fillText(line, x + 12, y + 57 + index * 14);
    });
  }

  function drawLane(
    fromLeft: boolean,
    y: number,
    label: string,
    packet: string | null,
    lost: boolean,
    left: number,
    right: number,
  ) {
    const fromX = fromLeft ? left : right;
    const toX = fromLeft ? right : left;
    const color = lost ? COLORS.bad : COLORS.arrow;

    // 没有第二个包（send 单向）时这条通道不画箭头，只留说明文字
    if (packet === null) {
      drawingContext.fillStyle = COLORS.muted;
      drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        '（此方向没有第二个包：send 单向，无 response）',
        left,
        y,
      );
      return;
    }

    // 箭头线
    drawingContext.strokeStyle = color;
    drawingContext.lineWidth = 1.5;
    drawingContext.setLineDash(lost ? [4, 3] : []);
    drawingContext.beginPath();
    drawingContext.moveTo(fromX, y);
    drawingContext.lineTo(toX - (fromLeft ? 8 : -8), y);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    const tipX = toX;
    drawingContext.moveTo(tipX, y);
    drawingContext.lineTo(tipX - (fromLeft ? 9 : -9), y - 4.5);
    drawingContext.lineTo(tipX - (fromLeft ? 9 : -9), y + 4.5);
    drawingContext.closePath();
    drawingContext.fill();

    // 线上包 JSON（画在箭头上方）与通道标签（画在箭头下方）
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillStyle = lost ? COLORS.bad : COLORS.heading;
    drawTextLines(
      wrapText(packet, right - left, drawingContext).slice(0, 3),
      left,
      y - 8,
      15,
    );
    if (lost) {
      // 居中画在箭头下方，避开画面左下角的派生读数浮层
      drawingContext.fillStyle = COLORS.bad;
      const text = '× 未到达';
      const textWidth = drawingContext.measureText(text).width;
      drawingContext.fillText(text, (left + right - textWidth) / 2, y + 30);
    }

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, left, y + 15);
  }

  function draw() {
    const scene = resolveScene(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(340, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 24;
    const innerWidth = width - margin * 2;

    // 标题与补充说明（失败路径的原因写在标题下）
    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(scene.title, margin, 32);
    if (scene.note) {
      drawingContext.fillStyle = scene.resultBad ? COLORS.bad : COLORS.muted;
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(scene.note, margin, 52);
    }

    // 两端：视图固定在左，主进程固定在右；谁是发起方由场景决定。
    // 舞台是 16:9，窄视口时改用紧凑间距，避免底部内容被裁掉
    const compact = height < 360;
    const gap = 16;
    const boxWidth = (innerWidth - gap) / 2;
    const boxHeight = compact ? 88 : 100;
    const boxTop = scene.note ? (compact ? 64 : 68) : compact ? 60 : 62;
    drawSideBox(
      margin,
      boxTop,
      boxWidth,
      boxHeight,
      '视图（webview）',
      scene.callerIsView,
      scene.callerIsView ? scene.callerCode : scene.calleeCode,
    );
    drawSideBox(
      margin + boxWidth + gap,
      boxTop,
      boxWidth,
      boxHeight,
      '主进程（bun）',
      !scene.callerIsView,
      scene.callerIsView ? scene.calleeCode : scene.callerCode,
    );

    // 两条通道：包 1（请求/消息）与包 2（响应；send 场景没有第二个包）
    const lane1Y = boxTop + boxHeight + (compact ? 52 : 66);
    const lane2Y = lane1Y + (compact ? 76 : 92);
    drawLane(
      scene.callerIsView,
      lane1Y,
      scene.isRequest ? 'request 包' : 'message 包',
      scene.packet1,
      false,
      margin,
      margin + innerWidth,
    );
    drawLane(
      !scene.callerIsView,
      lane2Y,
      'response 包（按 id=1 配对）',
      scene.packet2,
      scene.responseLost,
      margin,
      margin + innerWidth,
    );

    emit({
      direction: scene.direction,
      proxyCode: scene.callerCode,
      packet1: shortPacket1(scene),
      packet2: shortPacket2(scene),
      result: scene.result,
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
