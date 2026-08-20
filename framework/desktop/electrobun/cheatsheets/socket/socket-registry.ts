/**
 * 演示内容：主进程里 Socket.socketMap 登记表在一个视图的完整生命周期里
 * 如何变化，以及每个阶段两个方向的消息各走哪条路。
 * 依据 electrobun 1.18.1 包内 dist/api/bun/core/Socket.ts 的 open/close
 * 处理与 BrowserView.ts 的发送判定：
 * - 条目在视图侧连接 open 时才创建（视图创建 ≠ 登记）；
 * - close 只把 socket 置 null，条目保留；
 * - 页面重载的新连接按 webviewId 覆盖同 id 条目（后到覆盖先到）；
 * - 视图 remove() / 窗口关闭时条目整体删除（removeSocketForWebview）；
 * - queue 字段恒为 []（1.18.1 中未被任何代码读写）。
 * 输入：生命周期阶段（未连接 / OPEN / 断开 / 重载覆盖 / 已移除）。
 * 操作：在 Controls 中切换阶段。
 * 预期结果：登记表读数、两个方向的路径判定与视图状态随之变化；
 * 断开阶段两个方向都落到原生桥回落，1.18.1 没有自动重连。
 * 阅读主线：factsFor() 是唯一的判定逻辑，draw() 只负责画出来。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RegistryStage = 'created' | 'open' | 'closed' | 'reloaded' | 'removed';

export interface SocketRegistryOptions {
  stage: RegistryStage;
}

export interface SocketRegistrySnapshot {
  entry: string;
  bunToView: string;
  viewToBun: string;
  viewState: string;
}

export interface SocketRegistryInstance {
  update(options: SocketRegistryOptions): void;
  dispose(): void;
}

// 每个阶段的展示事实：snapshot 给 readout（完整），短句给画布盒子。
// 与 Socket.ts / BrowserView.ts 的实现逐条对应，是本演示唯一的事实源。
interface RegistryFacts {
  snapshot: SocketRegistrySnapshot;
  entryCode: string;
  entryNote: string;
  bunCode: string;
  bunNote: string;
  viewCode: string;
  viewNote: string;
  viewStateCode: string;
}

function factsFor(stage: RegistryStage): RegistryFacts {
  switch (stage) {
    case 'created':
      return {
        snapshot: {
          entry: '（无条目）',
          bunToView: '回落：注入 receiveMessageFromBun(json)',
          viewToBun: '回落：postMessage 桥（若已构造 rpc）',
          viewState: '页面加载中：视图已创建，连接还没 open',
        },
        entryCode: '（无条目）',
        entryNote: '视图创建不写表；open 事件才登记',
        bunCode: 'executeJavascript 注入',
        bunNote: '查表无 socket → 返回 false → 回落',
        viewCode: 'postMessage 过桥',
        viewNote: '页面尚未连接，rpc 若已构造也走桥',
        viewStateCode: '页面加载中，连接未建立',
      };
    case 'open':
      return {
        snapshot: {
          entry: '1: { socket: ws·OPEN, queue: [] }',
          bunToView: '加密 socket：secretKey 加密 → ws.send(密文包)',
          viewToBun: '加密 socket：__electrobun_encrypt → ws.send(密文包)',
          viewState: '页面在跑：Electroview 已构造，连接 OPEN',
        },
        entryCode: '1: { socket: ws·OPEN, queue: [] }',
        entryNote: 'open 事件写入；queue 恒为 []',
        bunCode: 'ws.send(密文包)',
        bunNote: 'bun 侧用 browserView.secretKey 加密',
        viewCode: 'ws.send(密文包)',
        viewNote: '视图侧用 __electrobun_encrypt 加密',
        viewStateCode: '已连接：连接 OPEN，双向都走 socket',
      };
    case 'closed':
      return {
        snapshot: {
          entry: '1: { socket: null, queue: [] }',
          bunToView: '回落：注入 receiveMessageFromBun(json)',
          viewToBun: '回落：__electrobunBunBridge.postMessage(json)',
          viewState: '连接已断开（close 只置 null，条目保留；无自动重连）',
        },
        entryCode: '1: { socket: null, queue: [] }',
        entryNote: 'close 只置空不删除，条目保留',
        bunCode: 'executeJavascript 注入',
        bunNote: 'socket 非 OPEN → 返回 false → 回落',
        viewCode: 'postMessage 过桥',
        viewNote: '视图侧 readyState 不是 OPEN → 过桥',
        viewStateCode: '连接断开：条目保留，双向走回落',
      };
    case 'reloaded':
      return {
        snapshot: {
          entry: '1: { socket: ws·OPEN（新连接）, queue: [] }',
          bunToView: '加密 socket：secretKey 加密 → ws.send(密文包)',
          viewToBun: '加密 socket：__electrobun_encrypt → ws.send(密文包)',
          viewState: '重载后的新页面：新连接按同 id 覆盖了旧条目',
        },
        entryCode: '1: { socket: ws·OPEN（新）, queue: [] }',
        entryNote: '同 id 后到覆盖先到，重载无缝接管',
        bunCode: 'ws.send(密文包)',
        bunNote: 'bun 侧用 browserView.secretKey 加密',
        viewCode: 'ws.send(密文包)',
        viewNote: '新页面重新构造 Electroview 并连接',
        viewStateCode: '重载后的新页面：新连接已覆盖',
      };
    case 'removed':
      return {
        snapshot: {
          entry: '（无条目）',
          bunToView: '跳过（视图已移除，发送前直接返回）',
          viewToBun: '无发送方（视图进程已销毁）',
          viewState: '视图已 remove()：removeSocketForWebview 删除了条目',
        },
        entryCode: '（无条目）',
        entryNote: 'removeSocketForWebview 删除了条目',
        bunCode: '（跳过）',
        bunNote: 'isRemoved 守卫：发送前直接返回',
        viewCode: '（无发送方）',
        viewNote: '视图进程已随移除销毁',
        viewStateCode: '视图已移除：条目已删除',
      };
  }
}

const COLORS = {
  heading: '#172033',
  muted: '#475569',
  plainBorder: '#94a3b8',
  accent: '#4f7cff',
  lock: '#0f766e',
  warn: '#b45309',
  dead: '#64748b',
  boxFill: '#ffffff',
  codeBg: '#f1f5f9',
  stripActive: '#4f7cff',
};

export function createSocketRegistry(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SocketRegistrySnapshot) => void,
): SocketRegistryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: SocketRegistryOptions = { stage: 'open' };

  // 按当前字体实测宽度截断，避免长文案溢出盒子
  function fitText(text: string, maxWidth: number): string {
    if (drawingContext.measureText(text).width <= maxWidth) {
      return text;
    }
    let fitted = text;
    while (fitted.length > 1 && drawingContext.measureText(`${fitted}…`).width > maxWidth) {
      fitted = fitted.slice(0, -1);
    }
    return `${fitted}…`;
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
    drawingContext.fillText(fitText(title, width - 24), x + 12, y + 22);

    drawingContext.fillStyle = COLORS.codeBg;
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(x + 12, y + 32, width - 24, 24, 5);
    drawingContext.fill();

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(fitText(code, width - 44), x + 22, y + 48);

    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '11px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(fitText(note, width - 24), x + 12, y + height - 10);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(620, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const facts = factsFor(current.stage);
    const socketAlive =
      current.stage === 'open' || current.stage === 'reloaded';
    const pathColor = socketAlive
      ? COLORS.lock
      : current.stage === 'removed'
        ? COLORS.dead
        : COLORS.warn;

    drawingContext.fillStyle = COLORS.heading;
    drawingContext.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('socketMap 登记表的一生（webviewId = 1）', 24, 34);
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      fitText(
        '条目跟着「连接」走，不跟着「视图」走；消息走哪条路只看这条连接是否可用',
        width - 48,
      ),
      24,
      56,
    );

    const margin = 24;
    const boxWidth = width - margin * 2;
    let y = 80;

    // ① 登记表
    drawBox(
      margin,
      y,
      boxWidth,
      78,
      '① Socket.socketMap（主进程登记表）',
      facts.entryCode,
      facts.entryNote,
      COLORS.accent,
    );
    y += 78 + 26;

    // ② / ③ 两个方向并排
    const gap = 16;
    const halfWidth = (boxWidth - gap) / 2;
    drawBox(
      margin,
      y,
      halfWidth,
      118,
      '② bun → 视图',
      facts.bunCode,
      facts.bunNote,
      pathColor,
    );
    drawBox(
      margin + halfWidth + gap,
      y,
      halfWidth,
      118,
      '③ 视图 → bun',
      facts.viewCode,
      facts.viewNote,
      pathColor,
    );
    y += 118 + 26;

    // ④ 视图状态
    drawBox(
      margin,
      y,
      boxWidth,
      78,
      '④ 视图（webview 1）当前状态',
      facts.viewStateCode,
      '断开后的回落是常态而非异常：业务消息照送，只是不再走加密连接',
      COLORS.accent,
    );
    y += 78 + 26;

    // 生命周期条
    const steps = [
      { key: 'created', label: '视图创建' },
      { key: 'open', label: 'open 登记' },
      { key: 'closed', label: 'close 置空' },
      { key: 'reloaded', label: '重载覆盖' },
      { key: 'removed', label: 'remove 删除' },
    ];
    const stripHeight = 46;
    drawingContext.fillStyle = COLORS.codeBg;
    drawingContext.strokeStyle = COLORS.plainBorder;
    drawingContext.lineWidth = 1;
    drawingContext.beginPath();
    drawingContext.roundRect(margin, y, boxWidth, stripHeight, 8);
    drawingContext.fill();
    drawingContext.stroke();

    const stepGap = 18;
    const stepWidth =
      (boxWidth - stepGap * (steps.length - 1) - 24) / steps.length;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    steps.forEach((step, index) => {
      const stepX = margin + 12 + index * (stepWidth + stepGap);
      const active = step.key === current.stage;
      if (active) {
        drawingContext.fillStyle = `${COLORS.stripActive}22`;
        drawingContext.strokeStyle = COLORS.stripActive;
        drawingContext.lineWidth = 1.5;
        drawingContext.beginPath();
        drawingContext.roundRect(stepX - 5, y + 7, stepWidth + 10, stripHeight - 14, 6);
        drawingContext.fill();
        drawingContext.stroke();
      }
      drawingContext.fillStyle = active ? COLORS.stripActive : COLORS.muted;
      drawingContext.font = `${active ? '600 ' : ''}12px ui-sans-serif, system-ui, sans-serif`;
      drawingContext.textAlign = 'center';
      drawingContext.fillText(
        fitText(step.label, stepWidth + 8),
        stepX + stepWidth / 2,
        y + stripHeight / 2 + 4,
      );
      drawingContext.textAlign = 'left';

      if (index < steps.length - 1) {
        drawingContext.strokeStyle = COLORS.plainBorder;
        drawingContext.beginPath();
        drawingContext.moveTo(stepX + stepWidth + 3, y + stripHeight / 2);
        drawingContext.lineTo(stepX + stepWidth + stepGap - 6, y + stripHeight / 2);
        drawingContext.stroke();
      }
    });
    y += stripHeight + 20;

    // 底部事实条
    drawingContext.fillStyle = COLORS.muted;
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      fitText(
        '本 Canvas 是登记表机制的浏览器示意；真实行为用课程目录的 socket-map-observer 工程核对。',
        width - 48,
      ),
      margin,
      y + 6,
    );
    drawingContext.fillText(
      fitText(
        '1.18.1 没有自动重连：断开后两个方向一直走原生桥回落，直到页面重新加载建立新连接。',
        width - 48,
      ),
      margin,
      y + 26,
    );

    emit(facts.snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  draw();

  return {
    update(options) {
      current = { stage: options.stage };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
