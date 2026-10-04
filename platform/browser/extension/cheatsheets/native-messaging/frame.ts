/**
 * 范例介绍：一条 native messaging 消息在管道里的字节形态。
 * 前置状态：扩展向 host 发送 { text: "…" }；host 收到的帧与扩展发出的同一种格式。
 * 主要操作：拖动「text 填充字符数」、勾选「中文填充（UTF-8 多字节）」。
 * 预期结果：帧头恒为该消息 JSON 的 UTF-8 字节数的小端 4 字节编码；同样字符数下
 * 中文填充的字节数约为 ASCII 的 3 倍，帧头随之变大；超过 host→Chrome 的 1 MiB
 * 上限时帧体标红。
 * 阅读主线：上部帧结构示意，中部前几个填充字符的 UTF-8 字节明细。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** host→Chrome 的单条消息上限 1 MiB：Chrome 保护自己免于失控的本机应用。 */
const HOST_TO_CHROME_LIMIT = 1024 * 1024;

const INK = '#172033';
const MUTED = '#475569';

const encoder = new TextEncoder();

export interface MessageFrameOptions {
  /** text 字段填充的字符数，用来把消息推到 1 MiB 边界附近。 */
  fill: number;
  /** true 用「中」填充（UTF-8 每字符 3 字节），false 用「a」（每字符 1 字节）。 */
  unicode: boolean;
}

export interface MessageFrameSnapshot {
  textChars: number;
  messageBytes: number;
  headerHex: string;
  limitLabel: string;
}

export interface MessageFrameInstance {
  update(options: MessageFrameOptions): void;
  dispose(): void;
}

/** 把字节数编码成小端 4 字节头后以 hex 展示。 */
function toLittleEndianHex(value: number): string {
  return [0, 1, 2, 3]
    .map((index) => (value >>> (8 * index)) & 0xff)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

/** 单个字符 UTF-8 编码后的字节 hex，如「中」→ e4 b8 ad。 */
function charUtf8Hex(char: string): string {
  return Array.from(encoder.encode(char), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join(' ');
}

function measure(fill: number, unicode: boolean): { text: string; bytes: number } {
  const text = unicode ? '中'.repeat(fill) : 'a'.repeat(fill);
  return { text, bytes: encoder.encode(JSON.stringify({ text })).length };
}

export function createFrameExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MessageFrameSnapshot) => void,
): MessageFrameInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: MessageFrameOptions = { fill: 64, unicode: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const { text, bytes } = measure(current.fill, current.unicode);
    const headerHex = toLittleEndianHex(bytes);
    const overLimit = bytes > HOST_TO_CHROME_LIMIT;

    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一条消息 = 4 字节小端长度头 + UTF-8 JSON 负载', 40, 40);

    // 帧示意：4 字节头 + 负载；两侧宽度按 log2 缩放，让 11 字节与 1 MiB 同图可比
    const trackX = 40;
    const trackY = 62;
    const trackW = Math.max(160, width - 80);
    const headerW = 34;
    const loadTrack = trackW - headerW;
    const ratio = Math.log2(bytes + 1) / Math.log2(HOST_TO_CHROME_LIMIT + 1);
    const loadW = Math.max(8, Math.min(loadTrack, ratio * loadTrack));

    // 长度头
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.beginPath();
    drawingContext.rect(trackX, trackY, headerW, 34);
    drawingContext.fill();
    drawingContext.fillStyle = '#ffffff';
    drawingContext.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.textAlign = 'center';
    drawingContext.fillText('4B', trackX + headerW / 2, trackY + 21);

    // 负载
    drawingContext.fillStyle = overLimit ? '#b91c1c' : '#93c5fd';
    drawingContext.beginPath();
    drawingContext.rect(trackX + headerW, trackY, loadW, 34);
    drawingContext.fill();

    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = INK;
    drawingContext.fillText(
      `长度头（小端）：${headerHex}`,
      trackX,
      trackY + 52,
    );
    drawingContext.fillStyle = overLimit ? '#b91c1c' : MUTED;
    drawingContext.fillText(
      overLimit
        ? `负载 ${bytes.toLocaleString('en-US')} 字节 JSON —— 超出 host→Chrome 1 MiB 上限`
        : `负载 ${bytes.toLocaleString('en-US')} 字节 JSON`,
      trackX,
      trackY + 70,
    );

    // 1 MiB 上限标尺画在轨道末端（log2 满格处）
    const limitX = trackX + trackW;
    drawingContext.save();
    drawingContext.strokeStyle = '#b91c1c';
    drawingContext.setLineDash([4, 3]);
    drawingContext.beginPath();
    drawingContext.moveTo(limitX, trackY - 6);
    drawingContext.lineTo(limitX, trackY + 40);
    drawingContext.stroke();
    drawingContext.restore();
    drawingContext.fillStyle = '#b91c1c';
    drawingContext.textAlign = 'right';
    drawingContext.fillText('host→Chrome 上限 1 MiB', limitX, trackY - 12);

    // 前几个填充字符的 UTF-8 字节明细：ASCII 每字符 1 字节，中文 3 字节
    drawingContext.textAlign = 'left';
    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('text 字段前 3 个字符的 UTF-8 编码：', 40, trackY + 112);

    const sample = Array.from(text).slice(0, 3);
    if (sample.length === 0) {
      drawingContext.fillStyle = MUTED;
      drawingContext.font = '11.5px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        'text 为空，消息仍带 {"text":""} 共 11 字节的 JSON 骨架',
        40,
        trackY + 140,
      );
    } else {
      sample.forEach((char, index) => {
        const boxX = 40 + index * 168;
        const boxY = trackY + 128;
        drawingContext.strokeStyle = '#dbe3f0';
        drawingContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
        drawingContext.beginPath();
        drawingContext.rect(boxX, boxY, 148, 56);
        drawingContext.fill();
        drawingContext.stroke();

        drawingContext.fillStyle = INK;
        drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
        drawingContext.textAlign = 'center';
        drawingContext.fillText(char, boxX + 26, boxY + 34);

        drawingContext.fillStyle = MUTED;
        drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillText(charUtf8Hex(char), boxX + 84, boxY + 34);
      });
      drawingContext.textAlign = 'left';
    }

    drawingContext.fillStyle = MUTED;
    drawingContext.font = '11.5px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '帧头按 UTF-8 编码后的字节数计算，不是字符数；长度头用小端字节序写入。',
      40,
      height - 28,
    );

    emit({
      textChars: current.fill,
      messageBytes: bytes,
      headerHex,
      limitLabel: overLimit ? '超出 1 MiB 上限' : '1 MiB 以内',
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
