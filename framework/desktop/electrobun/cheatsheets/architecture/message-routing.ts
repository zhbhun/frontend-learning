/**
 * 演示内容：一条消息跨过「主进程 ↔ webview」边界时到底走哪条通道。
 * 判定输入只有三个：消息类型（用户 RPC / 框架内部 / 事件上报 / 脚本执行，
 * 含两个方向）、发送方或目标视图的信任级（trusted / sandbox）、socket 状态
 * （可用 / 断开）。判定矩阵与 electrobun 1.18.1 包内实现一一对应：
 * - 用户 RPC 主路径是逐条 AES-256-GCM 加密的本地 WebSocket，断开时回落
 *   postMessage 桥（视图 → bun）或脚本注入 receiveMessageFromBun（bun → 视图）；
 * - 框架内部消息（webview 标签、拖拽区）走 internalBridge，批量明文 JSON；
 * - 事件上报走 eventBridge，单向、只认 webviewEvent，sandbox 视图也可用；
 * - sandbox 视图没有端口、密钥与两座 RPC 桥（原生层不注册），用户 RPC 与
 *   内部消息都不存在有效通道；
 * - executeJavascript 是主进程侧的 FFI 原生能力，不经 socket，也不受信任级限制。
 * 操作：在 Controls 中切换三个输入。
 * 预期结果：站点序列、通道标签、线上形态与送达结论随之变化；sandbox 组合
 * 的路径变灰并以「丢失 / 不会发生」收尾。
 * 阅读主线：routeFor() 是唯一的判定矩阵，draw() 只负责画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type MessageType =
  | 'user-rpc-out'
  | 'user-rpc-in'
  | 'internal'
  | 'event'
  | 'script';
export type TrustLevel = 'trusted' | 'sandbox';
export type SocketState = 'open' | 'down';

export interface MessageRoutingOptions {
  type: MessageType;
  trust: TrustLevel;
  socket: SocketState;
}

export interface MessageRoutingSnapshot {
  type: string;
  trust: string;
  socketEffect: string;
  channel: string;
  wire: string;
  outcome: string;
}

export interface MessageRoutingInstance {
  update(options: MessageRoutingOptions): void;
  dispose(): void;
}

type Tone = 'accent' | 'lock' | 'warn' | 'dead';

interface Step {
  title: string;
  code: string;
  note: string;
  tone: Tone;
}

interface Route {
  channel: string;
  socketEffect: string;
  wire: string;
  outcome: string;
  outcomeTone: Tone;
  steps: Step[];
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  accent: '#4f7cff',
  lock: '#0f766e',
  warn: '#b45309',
  dead: '#64748b',
  deadBorder: '#b91c1c',
  boxFill: '#ffffff',
  arrow: '#64748b',
  codeBg: '#f1f5f9',
};

const TYPE_LABELS: Record<MessageType, string> = {
  'user-rpc-out': '用户 RPC · 视图 → bun',
  'user-rpc-in': '用户 RPC · bun → 视图',
  internal: '框架内部 · 视图 → bun',
  event: '事件上报 · 视图 → bun',
  script: '脚本执行 · bun → 视图',
};

const TONE_COLORS: Record<Tone, string> = {
  accent: COLORS.accent,
  lock: COLORS.lock,
  warn: COLORS.warn,
  dead: COLORS.dead,
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// 按像素宽度自适应截断：结论条文字宽度随字体与中英文比例变化，
// 固定字符数截断在窄画布下仍会溢出
const measuringCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;
const measuringContext = measuringCanvas?.getContext('2d') ?? null;

function fitText(text: string, maxWidth: number, font: string): string {
  if (!measuringContext) {
    return truncate(text, 40);
  }
  measuringContext.font = font;
  if (measuringContext.measureText(text).width <= maxWidth) {
    return text;
  }
  let fitted = text;
  while (
    fitted.length > 1 &&
    measuringContext.measureText(`${fitted}…`).width > maxWidth
  ) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted}…`;
}

// 判定矩阵：消息类型 × 信任级 × socket 状态 → 通道与站点序列。
// 每个分支都与包内实现对应：trusted 视图的发送路径见
// dist/api/browser/index.ts（Electroview）与 dist/api/bun/preload/internalRpc.ts，
// sandbox 的断开点见 dist/api/bun/proc/native.ts 的 dynamicPreload 与
// initWebview 的 sandbox 参数。
function routeFor(
  type: MessageType,
  trust: TrustLevel,
  socket: SocketState,
): Route {
  const plaintext =
    '{"type":"message","id":"logToBun","payload":{"text":"hi"}}';

  if (type === 'user-rpc-out') {
    if (trust === 'sandbox') {
      return {
        channel: '无 —— 通道在两处被断开',
        socketEffect: '不适用（本就没有通道）',
        wire: '（无发送）',
        outcome: 'rpc 调用失效：没有可用的传输，消息到不了 bun',
        outcomeTone: 'dead',
        steps: [
          {
            title: '① rpc.send / rpc.request 产生明文 JSON 包',
            code: plaintext,
            note: '视图代码照常编写，但传输从未被绑定',
            tone: 'accent',
          },
          {
            title: '② 视图内没有 socket 通道',
            code: '无 __electrobunRpcSocketPort / __electrobunSecretKeyBytes',
            note: '最小 preload 不注入端口与密钥（native 层注入差异）',
            tone: 'dead',
          },
          {
            title: '③ 回落桥也不存在',
            code: '__electrobunBunBridge === undefined',
            note: '原生层对 sandbox 视图未注册该桥',
            tone: 'dead',
          },
        ],
      };
    }
    if (socket === 'open') {
      return {
        channel: '加密 WebSocket · ws://localhost:5xxxx/socket?webviewId=N',
        socketEffect: 'socket 可用：走主路径',
        wire: '{encryptedData, iv, tag}（base64 JSON）',
        outcome: '解密通过后送达 browserView.rpcHandler',
        outcomeTone: 'lock',
        steps: [
          {
            title: '① rpc.send / rpc.request 产生明文 JSON 包',
            code: plaintext,
            note: '由视图侧 rpc（Electroview.defineRPC）产生',
            tone: 'accent',
          },
          {
            title: '② 加密：AES-256-GCM · 12 字节随机 IV',
            code: '__electrobun_encrypt(json)',
            note: 'preload 注入的 WebCrypto，密钥来自 __electrobunSecretKeyBytes',
            tone: 'lock',
          },
          {
            title: '③ ws.send(密文包)',
            code: 'ws://localhost:50000…65535/socket?webviewId=N',
            note: '端口由主进程扫描指定；ws:// 不加 TLS 是有意设计',
            tone: 'lock',
          },
          {
            title: '④ 服务端解密 → rpcHandler',
            code: 'decrypt(browserView.secretKey, …)',
            note: '按 webviewId 取密钥：能解开即通过认证（key 即身份）',
            tone: 'accent',
          },
        ],
      };
    }
    return {
      channel: '回落：postMessage 原生桥',
      socketEffect: 'socket 断开：触发回落',
      wire: '明文 JSON 字符串',
      outcome: '送达 browserView.rpcHandler（socket 恢复后自动回到加密通道）',
      outcomeTone: 'warn',
      steps: [
        {
          title: '① rpc.send / rpc.request 产生明文 JSON 包',
          code: plaintext,
          note: '由视图侧 rpc（Electroview.defineRPC）产生',
          tone: 'accent',
        },
        {
          title: '② 过原生桥（不经 socket，也不套加密包）',
          code: '__electrobunBunBridge.postMessage(json)',
          note: 'socket 未 OPEN 时自动走这条备用路径',
          tone: 'warn',
        },
        {
          title: '③ JSCallback 收信 → rpcHandler',
          code: 'bunBridgePostmessageHandler(id, msg)',
          note: '原生层注册的 threadsafe 回调，逐视图路由',
          tone: 'warn',
        },
      ],
    };
  }

  if (type === 'user-rpc-in') {
    if (trust === 'sandbox') {
      return {
        channel: '无 —— 两个方向都到不了',
        socketEffect: '不适用（本就没有通道）',
        wire: '（无发送）',
        outcome: '消息丢失：sandbox 视图收不到用户 RPC 下发',
        outcomeTone: 'dead',
        steps: [
          {
            title: '① 主进程发起：win.webview.rpc.send(...)',
            code: 'win.webview.rpc.send.logToView({ text: "hi" })',
            note: 'bun 侧调用照常发出',
            tone: 'accent',
          },
          {
            title: '② socketMap 里没有该视图的连接',
            code: 'socketMap[webviewId] → undefined',
            note: 'sandbox 视图没有端口与密钥，从不连接 socket',
            tone: 'dead',
          },
          {
            title: '③ 回落注入也无处落地',
            code: 'window.__electrobun.receiveMessageFromBun(...)',
            note: 'sandbox 的最小 preload 没有安装这个收信桥',
            tone: 'dead',
          },
        ],
      };
    }
    if (socket === 'open') {
      return {
        channel: '加密 WebSocket · 发到该视图自己的连接',
        socketEffect: 'socket 可用：走主路径',
        wire: '{encryptedData, iv, tag}（base64 JSON）',
        outcome: '视图解密后经 receiveMessageFromBun 送达 rpcHandler',
        outcomeTone: 'lock',
        steps: [
          {
            title: '① 主进程发起：win.webview.rpc.send(...)',
            code: 'win.webview.rpc.send.logToView({ text: "hi" })',
            note: 'rpc 对象来自 BrowserView.defineRPC / 窗口 rpc 选项',
            tone: 'accent',
          },
          {
            title: '② 加密：node:crypto aes-256-gcm',
            code: 'encrypt(browserView.secretKey, json)',
            note: '主进程留存的那把 per-view 密钥，12 字节随机 IV',
            tone: 'lock',
          },
          {
            title: '③ 发到该视图登记的 socket 连接',
            code: 'socketMap[webviewId].socket.send(密文包)',
            note: '连接按 webviewId 登记，互不串扰',
            tone: 'lock',
          },
          {
            title: '④ 视图解密 → rpcHandler',
            code: '__electrobun_decrypt(...) → receiveMessageFromBun',
            note: '能解开说明消息来自持有密钥的一端',
            tone: 'accent',
          },
        ],
      };
    }
    return {
      channel: '回落：脚本注入',
      socketEffect: 'socket 断开：触发回落',
      wire: '注入的一行 JS（明文）',
      outcome: '视图执行注入脚本，消息进入 rpcHandler',
      outcomeTone: 'warn',
      steps: [
        {
          title: '① 主进程发起：win.webview.rpc.send(...)',
          code: 'win.webview.rpc.send.logToView({ text: "hi" })',
          note: 'socket 发送失败时传输层自动换路',
          tone: 'accent',
        },
        {
          title: '② 注入一行脚本进视图执行',
          code: 'window.__electrobun.receiveMessageFromBun(<json>)',
          note: '经 FFI evaluateJavascriptWithNoCompletion 完成',
          tone: 'warn',
        },
        {
          title: '③ 消息进入 rpcHandler',
          code: 'receiveMessageFromBun(msg) → rpcHandler(msg)',
          note: 'Electroview 构造时接管了这个收信入口',
          tone: 'warn',
        },
      ],
    };
  }

  if (type === 'internal') {
    if (trust === 'sandbox') {
      return {
        channel: '不会发生',
        socketEffect: '不经 socket（与 socket 无关）',
        wire: '（无发送）',
        outcome: '最小 preload 不含 webview 标签与拖拽区代码，没有产生此消息的机制',
        outcomeTone: 'dead',
        steps: [
          {
            title: '① 假设页面脚本直接调内部通道',
            code: 'internalRpc.send("webviewTagResize", …)',
            note: '框架代码才会这么发；sandbox 视图里这段代码不存在',
            tone: 'dead',
          },
          {
            title: '② 桥未注册',
            code: '__electrobunInternalBridge === undefined',
            note: '原生层对 sandbox 视图不注册内部 RPC 回调',
            tone: 'dead',
          },
        ],
      };
    }
    return {
      channel: 'internalBridge · 原生桥（批量）',
      socketEffect: '不经 socket（与 socket 无关）',
      wire: '批量明文 JSON（一串消息拼成数组）',
      outcome: '拆批后送达 internalRpcHandlers（框架专用，不进用户 rpc）',
      outcomeTone: 'accent',
      steps: [
        {
          title: '① 框架代码发出内部消息并入队',
          code: 'send("webviewTagResize", { id, frame, masks })',
          note: 'webview 标签、拖拽区（startWindowMove 等）走这里',
          tone: 'accent',
        },
        {
          title: '② 整批序列化（2ms 节流）',
          code: 'JSON.stringify(sendQueue)',
          note: '多条内部消息合成一批，降低过桥次数',
          tone: 'accent',
        },
        {
          title: '③ 过原生桥',
          code: '__electrobunInternalBridge.postMessage(batch)',
          note: '与用户 RPC 不同的另一座桥，单向到 bun',
          tone: 'accent',
        },
        {
          title: '④ 拆批分发',
          code: 'internalBridgeHandler → internalRpcHandlers',
          note: 'webviewTagInit 就在这里创建 BrowserView（OOPIF）',
          tone: 'accent',
        },
      ],
    };
  }

  if (type === 'event') {
    return {
      channel: 'eventBridge · 原生桥（单向）',
      socketEffect: '不经 socket（与 socket 无关）',
      wire: '明文 JSON（{"id":"webviewEvent","payload":…}）',
      outcome:
        trust === 'sandbox'
          ? '进入主进程事件总线 —— sandbox 视图唯一保留的通道'
          : '进入主进程事件总线（Electrobun.events）',
      outcomeTone: trust === 'sandbox' ? 'lock' : 'accent',
      steps: [
        {
          title: '① 引擎事件发生（如页面加载完成）',
          code: 'dom-ready / did-navigate / host-message …',
          note: '由 preload 的生命周期初始化代码组装',
          tone: 'accent',
        },
        {
          title: '② 过事件桥',
          code: '__electrobunEventBridge.postMessage(包)',
          note: '全部视图可用（含 sandbox）——这是信任分级的底线通道',
          tone: 'accent',
        },
        {
          title: '③ 原生侧只认 webviewEvent',
          code: 'if (jsonMessage.id === "webviewEvent") { … }',
          note: '其他消息类型被静默忽略，事件桥不能当 RPC 用',
          tone: 'lock',
        },
        {
          title: '④ 进入主进程事件总线',
          code: 'webviewEventHandler(id, eventName, detail)',
          note: '宿主页面经 tag.on() 收到的是另一条回流（见 webview 标签课）',
          tone: 'accent',
        },
      ],
    };
  }

  // type === 'script'
  return {
    channel: 'FFI · 进程内原生调用',
    socketEffect: '不经 socket（与 socket 无关）',
    wire: '一段 JS 源码（主进程 → 原生层 → 视图引擎）',
    outcome:
      trust === 'sandbox'
        ? '脚本照常执行 —— 这是主进程持有的能力，不属于视图的通道'
        : '脚本执行（fire-and-forget，无返回值）',
    outcomeTone: 'accent',
    steps: [
      {
        title: '① 主进程调用',
        code: 'view.executeJavascript(js)',
        note: 'BrowserView / webview 标签都暴露这个方法',
        tone: 'accent',
      },
      {
        title: '② 经 FFI 下发原生层',
        code: 'ffi.request.evaluateJavascriptWithNoCompletion({ id, js })',
        note: '进程内函数调用，不出主进程，不占用任何消息通道',
        tone: 'accent',
      },
      {
        title: '③ 原生层在目标 webview 里求值',
        code: '(fire-and-forget)',
        note: '要拿返回值就走 RPC，不走这条通道',
        tone: 'accent',
      },
    ],
  };
}

export function createMessageRouting(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MessageRoutingSnapshot) => void,
): MessageRoutingInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: MessageRoutingOptions = {
    type: 'user-rpc-out',
    trust: 'trusted',
    socket: 'open',
  };

  function drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    step: Step,
  ) {
    const accent = TONE_COLORS[step.tone];
    drawingContext.fillStyle = COLORS.boxFill;
    drawingContext.strokeStyle = accent;
    drawingContext.lineWidth = step.tone === 'dead' ? 1 : 1.5;
    drawingContext.beginPath();
    drawingContext.roundRect(x, y, width, height, 8);
    drawingContext.fill();
    drawingContext.stroke();

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(step.title, x + 12, y + 22);

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
    drawingContext.fillText(truncate(step.code, maxChars), x + 22, y + 48);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(step.note, x + 12, y + height - 10);
  }

  function drawArrow(x: number, fromY: number, toY: number) {
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
  }

  function draw() {
    const route = routeFor(current.type, current.trust, current.socket);
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const margin = 24;
    const boxWidth = width - margin * 2;
    const boxHeight = 78;
    const gap = 34;
    const top = 104;
    const stepsHeight = route.steps.length * (boxHeight + gap) - gap;
    const height = Math.max(560, top + stepsHeight + 96);

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const trustLabel =
      current.trust === 'trusted' ? 'trusted 视图' : 'sandbox 视图';
    const trustNote =
      current.type === 'user-rpc-out' || current.type === 'internal'
        ? `发送方：${trustLabel}`
        : current.type === 'user-rpc-in' || current.type === 'script'
          ? `目标视图：${trustLabel}`
          : `发送方：${trustLabel}（事件桥不分档）`;

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('一条消息走哪条通道？', margin, 34);
    const labelFont = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = labelFont;
    drawingContext.fillText(
      fitText(
        `${TYPE_LABELS[current.type]} ｜ ${trustNote} ｜ socket ${
          current.socket === 'open' ? '可用' : '断开'
        }`,
        width - margin * 2,
        labelFont,
      ),
      margin,
      56,
    );
    drawingContext.fillText(
      fitText(`通道：${route.channel}`, width - margin * 2, labelFont),
      margin,
      76,
    );

    let y = top;
    route.steps.forEach((step, index) => {
      drawBox(margin, y, boxWidth, boxHeight, step);
      if (index < route.steps.length - 1) {
        drawArrow(margin + boxWidth / 2, y + boxHeight, y + boxHeight + gap);
      }
      y += boxHeight + gap;
    });

    // 底部结论条
    const noteTop = y - gap + 20;
    drawingContext.fillStyle = COLORS.codeBg;
    drawingContext.strokeStyle =
      route.outcomeTone === 'dead' ? COLORS.deadBorder : COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, noteTop, boxWidth, 44, 8);
    drawingContext.fill();
    drawingContext.stroke();
    const noteFont = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillStyle =
      route.outcomeTone === 'dead' ? COLORS.deadBorder : COLORS.muted;
    drawingContext.font = noteFont;
    drawingContext.fillText(
      fitText(`结果：${route.outcome}`, boxWidth - 24, noteFont),
      margin + 12,
      noteTop + 19,
    );
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.fillText(
      fitText(`线上形态：${route.wire}`, boxWidth - 24, noteFont),
      margin + 12,
      noteTop + 35,
    );

    emit({
      type: TYPE_LABELS[current.type],
      trust: trustLabel,
      socketEffect: route.socketEffect,
      channel: route.channel,
      wire: route.wire,
      outcome: route.outcome,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  draw();

  return {
    update(options) {
      current = { ...options };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
