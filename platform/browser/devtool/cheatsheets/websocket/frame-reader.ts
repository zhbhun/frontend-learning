/**
 * 范例介绍：「消息帧阅读器」——按 DevTools Network 面板 Messages 页签的读法解读
 *   一组模拟的 WebSocket 帧。
 * 输入与前置：Controls「帧场景」在四组预置帧序列间切换（文本往返 / 二进制与
 *   分片 / 心跳保活 / 关闭握手）。这不是真实连接：WS 需要真实服务端，静态
 *   Storybook 页面无法稳定复现；真实连接的跑法见课程「最小服务端与客户端」。
 * 主要操作：切换帧场景，观察画布帧行的行色、方向箭头、Data 与 Length。
 * 预期结果：画布按 Messages 页签的配色渲染帧行（浅绿=发出、白=到达、浅黄=
 *   opcode 控制帧），readout 给出该场景的读法结论；文本帧 Length 用
 *   TextEncoder 现算 UTF-8 字节数，与面板 Length 列同义。
 * 阅读主线：SCENARIOS（预置帧数据）→ describeFrame()（Data/Length 列取值，
 *   对齐 DevTools 的 opcode 显示格式）→ draw()（按页签配色渲染表格）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioId = 'text-echo' | 'binary-split' | 'heartbeat' | 'closing';

/** 一条帧行：kind 决定 Data 列显示消息文本还是 opcode 名称。 */
export interface FrameSpec {
  direction: 'send' | 'receive';
  kind: 'text' | 'opcode' | 'error';
  /** kind=text：消息文本；kind=opcode：opcode 的英文名称（对齐 DevTools 文案）。 */
  text?: string;
  /** kind=opcode：opcode 数字；kind=text：忽略。 */
  opcode?: number;
  /** 客户端发出的帧必须掩码——DevTools 在 opcode 行尾显示 ", mask" 后缀。 */
  masked?: boolean;
  /** kind=opcode：payload 字节（Length 列来源）；ping/pong 为空即 0 字节。 */
  payload?: Uint8Array;
  /** kind=error：错误描述（Length 列显示 N/A）。 */
  errorText?: string;
}

export interface FrameScenario {
  id: ScenarioId;
  label: string;
  frames: FrameSpec[];
  /** readout 输出的读法结论。 */
  verdict: string;
}

export interface FrameReaderOptions {
  scenario: ScenarioId;
}

export interface FrameReaderSnapshot {
  scenarioId: ScenarioId;
  label: string;
  verdict: string;
  frameCount: number;
}

export interface FrameReaderInstance {
  update(options: FrameReaderOptions): void;
  dispose(): void;
}

/** close 帧 payload：前 2 字节是 close code，后跟可选 reason。 */
function closePayload(code: number, reason = ''): Uint8Array {
  const reasonBytes = new TextEncoder().encode(reason);
  const bytes = new Uint8Array(2 + reasonBytes.length);
  bytes[0] = (code >> 8) & 0xff;
  bytes[1] = code & 0xff;
  bytes.set(reasonBytes, 2);
  return bytes;
}

/** 二进制帧示例 payload：PNG 文件魔数（8 字节）与一个 4 字节分片。 */
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SPLIT_TAIL = new Uint8Array([0x00, 0x00, 0x00, 0x0d]);

export const SCENARIOS: Record<ScenarioId, FrameScenario> = {
  'text-echo': {
    id: 'text-echo',
    label: '文本往返',
    frames: [
      { direction: 'send', kind: 'text', text: '{"type":"chat","text":"hi"}' },
      { direction: 'receive', kind: 'text', text: '{"type":"chat","text":"hi"}' },
      { direction: 'send', kind: 'text', text: '{"type":"typing"}' },
      { direction: 'receive', kind: 'text', text: '{"type":"typing"}' },
    ],
    verdict: '浅绿 = 你发出，白 = 服务器到达；文本帧 Data 列直接显示内容，Length 是 payload 字节数。',
  },
  'binary-split': {
    id: 'binary-split',
    label: '二进制与分片',
    frames: [
      { direction: 'receive', kind: 'opcode', text: 'Binary message', opcode: 2, payload: PNG_MAGIC },
      { direction: 'receive', kind: 'opcode', text: 'Continuation frame', opcode: 0, payload: SPLIT_TAIL },
    ],
    verdict: '二进制与控制帧的 Data 列显示 opcode 名称而非内容；Continuation frame (Opcode 0) 接续上一条消息的分片。',
  },
  heartbeat: {
    id: 'heartbeat',
    label: '心跳保活',
    frames: [
      { direction: 'receive', kind: 'opcode', text: 'Ping message', opcode: 9, payload: new Uint8Array() },
      { direction: 'send', kind: 'opcode', text: 'Pong message', opcode: 10, masked: true, payload: new Uint8Array() },
    ],
    verdict: '服务器 Ping、浏览器协议层自动回 Pong——不触发 JS 的 message 事件；这对浅黄行就是保活正常，mask 表明是客户端发出。',
  },
  closing: {
    id: 'closing',
    label: '关闭握手',
    frames: [
      { direction: 'send', kind: 'opcode', text: 'Connection close message', opcode: 8, masked: true, payload: closePayload(1000, 'bye') },
      { direction: 'receive', kind: 'opcode', text: 'Connection close message', opcode: 8, payload: closePayload(1000) },
    ],
    verdict: '关闭握手双向成对，谁先发起看方向；payload 前 2 字节是 close code（1000 = Normal Closure，正常关闭）。',
  },
};

/** Messages 页签配色：发出浅绿、到达白、opcode 浅黄、错误浅红。 */
const ROW_COLORS = {
  send: '#dcf5dc',
  receive: '#ffffff',
  opcode: '#fdf1cc',
  error: '#fadcdc',
} as const;

const COLORS = {
  ink: '#172033',
  muted: '#5d6f8a',
  grid: '#dbe3f0',
  headerBg: '#eef2f8',
  pageBg: '#f8fafc',
} as const;

/** Data 列取值：文本帧显示内容，其余显示 opcode 名称——与 DevTools 一致。 */
function describeFrame(frame: FrameSpec): string {
  if (frame.kind === 'text') {
    return frame.text ?? '';
  }
  if (frame.kind === 'error') {
    return frame.errorText ?? '(error)';
  }
  const maskSuffix = frame.masked ? ', mask' : '';
  return `${frame.text} (Opcode ${frame.opcode}${maskSuffix})`;
}

/** Length 列取值：文本帧按 UTF-8 字节数，opcode 帧按 payload 字节数，错误行 N/A。 */
function frameLength(frame: FrameSpec): number | 'N/A' {
  if (frame.kind === 'error') {
    return 'N/A';
  }
  if (frame.kind === 'text') {
    return new TextEncoder().encode(frame.text ?? '').length;
  }
  return frame.payload?.length ?? 0;
}

export function createFrameReader(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FrameReaderSnapshot) => void,
): FrameReaderInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let scenario: FrameScenario = SCENARIOS['text-echo'];

  function truncate(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let cut = text.length;
    while (cut > 1 && drawingContext.measureText(`${text.slice(0, cut)}…`).width > maxWidth) {
      cut -= 1;
    }
    return `${text.slice(0, cut)}…`;
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);
    drawingContext.fillStyle = COLORS.pageBg;
    drawingContext.fillRect(0, 0, width, height);

    const pad = 18;
    const lengthColumnWidth = 64;

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `帧场景：${scenario.label} —— 模拟帧，按 Messages 页签读法渲染`,
      pad,
      pad + 8,
    );

    let y = pad + 34;

    // 表头：Data / Length，与 Messages 页签同名同序。
    drawingContext.fillStyle = COLORS.headerBg;
    drawingContext.fillRect(pad, y, width - pad * 2, 24);
    drawingContext.strokeStyle = COLORS.grid;
    drawingContext.strokeRect(pad, y, width - pad * 2, 24);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('Data', pad + 12, y + 16);
    drawingContext.textAlign = 'right';
    drawingContext.fillText('Length', width - pad - 12, y + 16);
    drawingContext.textAlign = 'left';
    y += 24;

    for (const frame of scenario.frames) {
      const rowHeight = 30;
      const background = frame.kind === 'opcode'
        ? ROW_COLORS.opcode
        : frame.kind === 'error'
          ? ROW_COLORS.error
          : ROW_COLORS[frame.direction];
      drawingContext.fillStyle = background;
      drawingContext.fillRect(pad, y, width - pad * 2, rowHeight);
      drawingContext.strokeStyle = COLORS.grid;
      drawingContext.strokeRect(pad, y, width - pad * 2, rowHeight);

      drawingContext.fillStyle = COLORS.ink;
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const arrow = frame.direction === 'send' ? '↑' : '↓';
      const dataMaxWidth = width - pad * 2 - lengthColumnWidth - 12 - 34;
      drawingContext.fillText(
        `${arrow} ${truncate(describeFrame(frame), dataMaxWidth)}`,
        pad + 12,
        y + 19,
      );
      drawingContext.textAlign = 'right';
      drawingContext.fillText(`${frameLength(frame)}`, width - pad - 12, y + 19);
      drawingContext.textAlign = 'left';
      y += rowHeight;
    }

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '行色：浅绿 = 发出 · 白 = 到达 · 浅黄 = opcode 控制帧 · 浅红 = 错误',
      pad,
      Math.min(height - 14, y + 22),
    );

    emit({
      scenarioId: scenario.id,
      label: scenario.label,
      verdict: scenario.verdict,
      frameCount: scenario.frames.length,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      scenario = SCENARIOS[options.scenario] ?? SCENARIOS['text-echo'];
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
