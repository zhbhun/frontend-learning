/**
 * 演示内容：一条 RPC 消息在视图与主进程之间到底走哪条路、线上长什么样。
 * socket 通道可用时，消息经 AES-256-GCM（12 字节随机 IV、末 16 字节 tag）
 * 加密成 {encryptedData, iv, tag} 的 base64 JSON 走本地 WebSocket；
 * socket 断开时回落到 postMessage 桥（视图→bun）或脚本注入
 * window.__electrobun.receiveMessageFromBun(...)（bun→视图），不再套加密包。
 * 加密用浏览器真实 WebCrypto 现场演算（与 preload 的实现同算法同格式，
 * 密钥是本演示随机生成的 32 字节；真实通道里是 BrowserView 构造时
 * randomBytes(32) 的 per-view 密钥），因此切任意参数再切回，
 * 密文与 IV 每次都不同。
 * 输入：方向（视图→bun / bun→视图）、通道（socket 可用 / 断开回落）、
 * 消息内容（明文 RPC 包 JSON）。
 * 操作：在 Controls 中切换方向、通道或修改消息内容。
 * 预期结果：socket 通道下看到真实密文包并解密回读一致；断开回落后
 * 通道标签、线上载荷与「加密」读数随之变化。
 * 阅读主线：recompute() 是唯一的判定与演算逻辑，draw() 只负责画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ChannelDirection = 'view-to-bun' | 'bun-to-view';
export type ChannelState = 'socket' | 'fallback';

export interface EncryptedChannelOptions {
  direction: ChannelDirection;
  channel: ChannelState;
  message: string;
}

export interface EncryptedChannelSnapshot {
  direction: string;
  route: string;
  crypto: string;
  wire: string;
  iv: string;
  roundtrip: string;
}

export interface EncryptedChannelInstance {
  update(options: EncryptedChannelOptions): void;
  dispose(): void;
}

const IV_BYTES = 12; // AES-GCM 推荐 IV 长度，与 preload 加密实现一致
const TAG_BYTES = 16; // GCM 认证标签长度，密文末 16 字节拆出为 tag

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  accent: '#4f7cff',
  lock: '#0f766e',
  warn: '#b45309',
  boxFill: '#ffffff',
  arrow: '#64748b',
  codeBg: '#f1f5f9',
};

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…（共 ${text.length} 字符）` : text;
}

// 一次完整的「加密 → 解密回读」演算，格式与 preload/主进程的实现一一对应
async function seal(
  key: CryptoKey,
  plaintext: string,
): Promise<{ packet: string; ivPreview: string; roundtrip: string }> {
  const encoded = new TextEncoder().encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  // 末 16 字节是 GCM tag，拆开再拼回，与 preload 加密实现的线上格式一致
  const sealedBytes = new Uint8Array(sealed);
  const data = sealedBytes.slice(0, sealedBytes.length - TAG_BYTES);
  const tag = sealedBytes.slice(sealedBytes.length - TAG_BYTES);
  const opened = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    sealed,
  );
  const packet = JSON.stringify({
    encryptedData: bufferToBase64(data),
    iv: bufferToBase64(iv),
    tag: bufferToBase64(tag),
  });
  return {
    packet,
    ivPreview: `${bufferToBase64(iv).slice(0, 12)}…`,
    roundtrip: new TextDecoder().decode(opened),
  };
}

export function createEncryptedChannel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: EncryptedChannelSnapshot) => void,
): EncryptedChannelInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: EncryptedChannelOptions = {
    direction: 'view-to-bun',
    channel: 'socket',
    message: '{"type":"message","id":"bunSays","payload":{"text":"hi"}}',
  };
  // 演算结果：null 表示这次演算还没回来（先画明文阶段）
  let sealed: Awaited<ReturnType<typeof seal>> | null = null;

  // 演示密钥：随机 32 字节。真实通道里这串字节来自 BrowserView 构造时的
  // randomBytes(32)，一端留在主进程、一端注入 preload。
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const keyPromise = crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  async function recompute() {
    sealed = null;
    // 第一帧只画「演算中」占位，不 emit——紧跟着的第二帧才是结果，
    // 连续两次 emit 会撞上 readout 的 100ms 节流把结果吞掉
    draw(false);
    const key = await keyPromise;
    const result = await seal(key, current.message);
    sealed = result;
    draw();
  }

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    code: string,
    note: string,
    accent: string,
  ) {
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = accent;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(title, x + 12, y + 22);

    drawingContext.fillStyle = COLORS.codeBg;
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(x + 12, y + 32, width - 24, 24, 5);
    drawingContext.fill();

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    // 按画布宽度自适应截断：11px 等宽字符约 6.6px 宽
    const maxChars = Math.max(20, Math.floor((width - 64) / 6.6));
    drawingContext.fillText(truncate(code, maxChars), x + 22, y + 48);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(note, x + 12, y + height - 10);
  }

  function drawArrow(x: number, fromY: number, toY: number, label: string) {
    drawingContext.strokeStyle = COLORS.arrow;
    drawingContext.fillStyle = COLORS.arrow;
    drawingContext.lineWidth = 1.5;
    drawingContext.beginPath();
    drawingContext.moveTo(x, fromY);
    drawingContext.lineTo(x, toY - 6);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(x, toY);
    drawingContext.lineTo(x - 4.5, toY - 9);
    drawingContext.lineTo(x + 4.5, toY - 9);
    drawingContext.closePath();
    drawingContext.fill();
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(label, x + 10, (fromY + toY) / 2 + 4);
  }

  function draw(emitSnapshot = true) {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(600, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const socketMode = current.channel === 'socket';
    const directionLabel =
      current.direction === 'view-to-bun' ? '视图 → bun' : 'bun → 视图';

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      `RPC 消息的加密旅程（${directionLabel}）`,
      24,
      34,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      socketMode
        ? 'socket 通道可用：逐条 AES-256-GCM 加密后走本地 WebSocket（ws:// 不加 TLS 是有意的）'
        : 'socket 断开：回落到原生桥，明文 JSON 直接过桥，不再套加密包',
      24,
      56,
    );

    const margin = 24;
    const boxWidth = width - margin * 2;
    const boxHeight = 78;
    const gap = 34;
    let y = 80;

    // 第 1 站：明文 RPC 包
    drawBox(
      margin,
      y,
      boxWidth,
      boxHeight,
      '① 明文 RPC 包（createRPC 序列化后的 JSON）',
      current.message,
      '由 rpc.send / rpc.request 产生',
      COLORS.accent,
    );
    drawArrow(margin + boxWidth / 2, y + boxHeight, y + boxHeight + gap, '');

    if (socketMode) {
      y += boxHeight + gap;
      drawBox(
        margin,
        y,
        boxWidth,
        boxHeight,
        '② 加密：AES-256-GCM · 12 字节随机 IV · per-view 密钥',
        sealed ? `iv = ${sealed.ivPreview}（每次加密都不同）` : 'iv = （演算中…）',
        current.direction === 'view-to-bun'
          ? '视图侧调用 __electrobun_encrypt（preload 注入的 WebCrypto）'
          : 'bun 侧用 node:crypto 以 browserView.secretKey 加密',
        COLORS.lock,
      );
      drawArrow(margin + boxWidth / 2, y + boxHeight, y + boxHeight + gap, '');

      y += boxHeight + gap;
      drawBox(
        margin,
        y,
        boxWidth,
        boxHeight,
        '③ 线上包：ws://localhost:5xxxx/socket?webviewId=N',
        sealed ? truncate(sealed.packet, 64) : '{encryptedData, iv, tag}（演算中…）',
        '三个字段全部 base64；密文与本演示的每次演算结果都不同',
        COLORS.lock,
      );
      drawArrow(margin + boxWidth / 2, y + boxHeight, y + boxHeight + gap, '');

      y += boxHeight + gap;
      drawBox(
        margin,
        y,
        boxWidth,
        boxHeight,
        '④ 对端解密 → 交给 rpcHandler',
        sealed
          ? sealed.roundtrip === current.message
            ? `解密回读 = 明文（一致）`
            : '解密回读不一致（异常）'
          : '解密回读（演算中…）',
        '对端持有同一把 per-view 密钥：能解开即通过认证（key 即身份）',
        COLORS.accent,
      );
    } else {
      y += boxHeight + gap;
      drawBox(
        margin,
        y,
        boxWidth,
        boxHeight,
        '② 回落通道：原生桥直传（不经 socket，也不套加密包）',
        current.direction === 'view-to-bun'
          ? '__electrobunBunBridge.postMessage(json)'
          : 'window.__electrobun.receiveMessageFromBun(json)',
        current.direction === 'view-to-bun'
          ? '视图侧：socket 未 OPEN 时自动走这个 postMessage 桥'
          : 'bun 侧：executeJavascript 注入上面这行脚本把 JSON 送进视图',
        COLORS.warn,
      );
      drawArrow(margin + boxWidth / 2, y + boxHeight, y + boxHeight + gap, '');

      y += boxHeight + gap;
      drawBox(
        margin,
        y,
        boxWidth,
        boxHeight,
        '③ 对端收到 → 交给 rpcHandler',
        'rpcHandler(JSON.parse(明文))',
        '回落只是备用路径：socket 恢复 OPEN 后自动回到加密通道',
        COLORS.warn,
      );
    }

    // 底部事实条
    const noteTop = y + boxHeight + 20;
    drawingContext.fillStyle = COLORS.codeBg;
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, noteTop, boxWidth, 44, 8);
    drawingContext.fill();
    drawingContext.stroke();
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      '切换任意参数再切回（或改一个字再改回来），密文与 IV 都会变——每条消息独立随机 IV。',
      margin + 12,
      noteTop + 19,
    );
    drawingContext.fillText(
      '本 Canvas 用浏览器 WebCrypto 现场演算，格式与 preload / 主进程的实现一致。',
      margin + 12,
      noteTop + 35,
    );

    if (emitSnapshot) {
      emit({
        direction: directionLabel,
        route: socketMode
          ? '加密 socket（ws://localhost）'
          : '回落：原生桥直传',
        crypto: socketMode
          ? 'AES-256-GCM · IV 12 字节 · tag 16 字节'
          : '无（回落路径不套加密包）',
        wire: socketMode
          ? '{encryptedData, iv, tag}（base64 JSON）'
          : '明文 JSON 字符串',
        iv: sealed ? sealed.ivPreview : '（演算中）',
        roundtrip: sealed
          ? sealed.roundtrip === current.message
            ? '与明文一致'
            : '不一致'
          : '（演算中）',
      });
    }
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  recompute();

  return {
    update(options) {
      current = {
        direction: options.direction,
        channel: options.channel,
        message: options.message,
      };
      recompute();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
