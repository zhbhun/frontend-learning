/**
 * 范例介绍：用两个真实 Y.Doc 复现 Hocuspocus 的同步过程模型与文档名（name）房间语义。
 * 前置状态：客户端 A、客户端 B 各持一份 Y.Doc，通过内存房间 MiniRelay（扮演服务器）互通；
 * 客户端 A 固定进入 name 为 demo-doc 的房间，客户端 B 的文档名由 Controls 切换。
 * 操作：修改「客户端 A 输入」观察增量 update 的转发；切换「客户端 B 文档名」观察同名汇聚、
 * 异名隔离。
 * 预期结果：同名时 B 与 A 内容一致，初始同步与增量 update 计数递增；异名时 B 面对空房间，
 * 内容清空、计数停止增长；切回同名后 B 经初始同步立刻拿到 A 的全部内容。
 * 阅读主线：MiniRelay.attach 的初始同步（状态向量换缺失更新）→ broadcast 的应用与转发 →
 * 底部读数核对两端内容与消息计数。
 * 与真实链路的差异：真实部署中传输层是 WebSocket 服务器，这里换成内存房间；Y.Doc 之间的
 * update 编码、应用与转发逻辑与真实同步过程一致。
 */
import * as Y from 'yjs';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 客户端 B 加入的房间：与 A 同名，或使用另一个文档名。 */
export type RoomChoice = 'same' | 'other';

export interface SyncModelOptions {
  /** 客户端 A 的文本输入。 */
  text: string;
  /** 客户端 B 加入的房间。 */
  roomB: RoomChoice;
}

export interface SyncModelSnapshot {
  textA: string;
  textB: string;
  /** 累计的初始同步次数（每个客户端接入触发一次）。 */
  initialSyncs: number;
  /** 房间累计转发的增量 update 条数。 */
  updatesRelayed: number;
  /** 两端内容是否一致。 */
  converged: boolean;
}

export interface SyncModelInstance {
  update(options: SyncModelOptions): void;
  dispose(): void;
}

/** 客户端 A 的房间文档名。 */
const CLIENT_A_ROOM = 'demo-doc';
/** 客户端 B 切到「异名」时的房间文档名。 */
const OTHER_ROOM = 'other-doc';

/**
 * 内存房间：扮演 Hocuspocus 服务器里按 name 缓存的那份 Y.Doc
 * （对应服务器源码中以 name 为键的 documents Map）。
 */
class MiniRelay {
  readonly name: string;

  /** 房间文档：同房间所有客户端的更新在这里汇聚。 */
  readonly doc = new Y.Doc();

  private clients: RoomClient[] = [];

  initialSyncs = 0;

  updatesRelayed = 0;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 客户端接入：对应 WebSocket 连上之后的初始同步。以客户端的状态向量为基准
   * （sync step 1），把房间文档中它缺失的内容编码成一条更新发过去（sync step 2）。
   */
  attach(client: RoomClient): void {
    this.clients.push(client);
    const stateVector = Y.encodeStateVector(client.doc);
    const missing = Y.encodeStateAsUpdate(this.doc, stateVector);
    this.initialSyncs += 1;
    client.receive(missing);
    client.synced = true;
  }

  /**
   * 收到某客户端的本地更新：先应用到房间文档，再转发给同房间的其他客户端。
   * 这正是服务器对增量 update 的处理：应用 + 广播给其余连接。
   */
  broadcast(source: RoomClient, update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, source);
    for (const client of this.clients) {
      if (client === source) {
        continue;
      }
      this.updatesRelayed += 1;
      client.receive(update);
    }
  }

  remove(client: RoomClient): void {
    this.clients = this.clients.filter((entry) => entry !== client);
  }
}

/** 房间成员：一份 Y.Doc 加一条到所在房间的上行通道。 */
class RoomClient {
  readonly doc = new Y.Doc();

  /** 初始同步完成后置为真，对应 provider 的 synced 时机。 */
  synced = false;

  constructor(private readonly relay: MiniRelay) {
    // 只有本地产生的更新才需要上行；origin 为 relay 的更新来自网络，
    // 不再回传，这正是 provider 里 documentUpdateHandler 的 origin 检查。
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== relay) {
        this.relay.broadcast(this, update);
      }
    });
    this.relay.attach(this);
  }

  receive(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update, this.relay);
  }

  /** 整段重写文本：放在同一个事务里，产生恰好一条增量 update。 */
  setText(text: string): void {
    this.doc.transact(() => {
      const ytext = this.doc.getText('demo');
      ytext.delete(0, ytext.length);
      if (text.length > 0) {
        ytext.insert(0, text);
      }
    });
  }

  get text(): string {
    return this.doc.getText('demo').toString();
  }

  destroy(): void {
    this.relay.remove(this);
    this.doc.destroy();
  }
}

const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_BODY = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

export function createSyncModel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SyncModelSnapshot) => void,
): SyncModelInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: SyncModelOptions = { text: '', roomB: 'same' };
  let rooms = new Map<string, MiniRelay>();
  let clientA: RoomClient | undefined;
  let clientB: RoomClient | undefined;

  function roomByName(name: string): MiniRelay {
    let room = rooms.get(name);
    if (!room) {
      room = new MiniRelay(name);
      rooms.set(name, room);
    }
    return room;
  }

  function roomNameForB(choice: RoomChoice): string {
    return choice === 'same' ? CLIENT_A_ROOM : OTHER_ROOM;
  }

  function snapshot(): SyncModelSnapshot {
    let initialSyncs = 0;
    let updatesRelayed = 0;
    rooms.forEach((room) => {
      initialSyncs += room.initialSyncs;
      updatesRelayed += room.updatesRelayed;
    });
    const textA = clientA?.text ?? '';
    const textB = clientB?.text ?? '';

    return {
      textA,
      textB,
      initialSyncs,
      updatesRelayed,
      converged: textA === textB,
    };
  }

  function build(): void {
    rooms = new Map();
    clientA = new RoomClient(roomByName(CLIENT_A_ROOM));
    clientB = new RoomClient(roomByName(roomNameForB(options.roomB)));
    if (options.text.length > 0) {
      clientA.setText(options.text);
    }
  }

  // ---------- 以下为绘制外壳：事件触发时重绘的说明性视图，无动画循环 ----------

  function wrapText(text: string, maxWidth: number, maxLines: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const char of Array.from(text)) {
      const candidate = current + char;
      if (current && drawingContext.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = char;
        if (lines.length >= maxLines) {
          return lines;
        }
      } else {
        current = candidate;
      }
    }
    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    return lines;
  }

  function roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, r);
    drawingContext.arcTo(x + w, y + h, x, y + h, r);
    drawingContext.arcTo(x, y + h, x, y, r);
    drawingContext.arcTo(x, y, x + w, y, r);
    drawingContext.closePath();
  }

  function drawPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    body: string,
  ): void {
    roundRectPath(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    drawingContext.stroke();

    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText(title, x + 14, y + 26);

    drawingContext.strokeStyle = '#edf1f8';
    drawingContext.beginPath();
    drawingContext.moveTo(x + 10, y + 38);
    drawingContext.lineTo(x + w - 10, y + 38);
    drawingContext.stroke();

    drawingContext.font = FONT_BODY;
    const lines = wrapText(body, w - 28, Math.max(1, Math.floor((h - 66) / 20)));
    if (lines.length === 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.fillText('（空文档）', x + 14, y + 62);
      return;
    }
    drawingContext.fillStyle = '#334155';
    lines.forEach((line, index) => {
      drawingContext.fillText(line, x + 14, y + 60 + index * 20);
    });
  }

  function drawBadge(cx: number, cy: number, label: string, sublabel?: string): void {
    drawingContext.font = FONT_BODY;
    const labelWidth = drawingContext.measureText(label).width;
    roundRectPath(cx - labelWidth / 2 - 12, cy - 13, labelWidth + 24, 26, 13);
    drawingContext.fillStyle = '#eef2ff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#c7d2fe';
    drawingContext.lineWidth = 1;
    drawingContext.stroke();
    drawingContext.fillStyle = '#3f4dbf';
    drawingContext.fillText(label, cx - labelWidth / 2, cy + 4);

    if (sublabel) {
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#64748b';
      const subWidth = drawingContext.measureText(sublabel).width;
      drawingContext.fillText(sublabel, cx - subWidth / 2, cy + 28);
    }
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    dashed: boolean,
  ): void {
    drawingContext.save();
    drawingContext.strokeStyle = dashed ? '#94a3b8' : '#4f7cff';
    drawingContext.fillStyle = drawingContext.strokeStyle;
    drawingContext.lineWidth = 1.5;
    if (dashed) {
      drawingContext.setLineDash([5, 4]);
    }
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    for (const [tipX, tipY, direction] of [
      [x1, y1, 1],
      [x2, y2, -1],
    ] as const) {
      drawingContext.beginPath();
      drawingContext.moveTo(tipX, tipY);
      drawingContext.lineTo(tipX + 7 * direction, tipY - 3.5);
      drawingContext.lineTo(tipX + 7 * direction, tipY + 3.5);
      drawingContext.closePath();
      drawingContext.fill();
    }
    drawingContext.restore();

    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = dashed ? '#64748b' : '#3b5bdb';
    const labelWidth = drawingContext.measureText(label).width;
    drawingContext.fillText(label, (x1 + x2) / 2 - labelWidth / 2, y1 - 9);
  }

  function draw(): void {
    if (!clientA || !clientB) {
      return;
    }
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(260, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const sameRoom = options.roomB === 'same';
    const margin = 24;
    const panelWidth = Math.min(250, Math.max(140, (width - margin * 2 - 150) / 2));
    const panelTop = 84;
    const panelHeight = height - panelTop - 46;
    const leftX = margin;
    const rightX = width - margin - panelWidth;
    const centerX = width / 2;

    drawPanel(leftX, panelTop, panelWidth, panelHeight, '客户端 A · Y.Doc', clientA.text);
    drawPanel(rightX, panelTop, panelWidth, panelHeight, '客户端 B · Y.Doc', clientB.text);

    if (sameRoom) {
      drawBadge(centerX, 32, `name: "${CLIENT_A_ROOM}"`, '服务器按 name 缓存的房间文档');
      drawArrow(
        leftX + panelWidth + 14,
        panelTop + 34,
        rightX - 14,
        panelTop + 34,
        '初始同步：接入时补齐缺失内容',
        true,
      );
      drawArrow(
        leftX + panelWidth + 14,
        panelTop + 78,
        rightX - 14,
        panelTop + 78,
        '增量 update：本地编辑实时转发',
        false,
      );
    } else {
      drawBadge(leftX + panelWidth / 2, 32, `name: "${CLIENT_A_ROOM}"`);
      drawBadge(rightX + panelWidth / 2, 32, `name: "${OTHER_ROOM}"`);
      drawingContext.save();
      drawingContext.strokeStyle = '#cbd5e1';
      drawingContext.setLineDash([4, 6]);
      drawingContext.beginPath();
      drawingContext.moveTo(centerX, panelTop - 12);
      drawingContext.lineTo(centerX, panelTop + panelHeight);
      drawingContext.stroke();
      drawingContext.restore();

      drawingContext.font = FONT_TITLE;
      drawingContext.fillStyle = '#9a3412';
      const dividerLabel = '不同房间';
      drawingContext.fillText(
        dividerLabel,
        centerX - drawingContext.measureText(dividerLabel).width / 2,
        panelTop + 38,
      );
      drawingContext.font = FONT_LABEL;
      drawingContext.fillStyle = '#64748b';
      const dividerNote = '消息互不转发';
      drawingContext.fillText(
        dividerNote,
        centerX - drawingContext.measureText(dividerNote).width / 2,
        panelTop + 58,
      );
    }

    const converged = clientA.text === clientB.text;
    const footer = converged ? '两端内容一致' : '两端内容隔离';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillStyle = converged ? '#166534' : '#9a3412';
    drawingContext.fillText(
      footer,
      centerX - drawingContext.measureText(footer).width / 2,
      height - 18,
    );
  }

  const resizeObserver = createResizeObserver(canvas, () => draw());

  build();
  draw();
  emit(snapshot());

  return {
    update(next) {
      const roomChanged = next.roomB !== options.roomB;
      const textChanged = next.text !== options.text;
      options = { ...next };

      if (roomChanged) {
        // 换房间 = 断开后按新文档名重新接入，重走一次连接与初始同步。
        clientB?.destroy();
        clientB = new RoomClient(roomByName(roomNameForB(options.roomB)));
      }
      if (textChanged) {
        clientA?.setText(options.text);
      }
      draw();
      emit(snapshot());
    },
    dispose() {
      clientA?.destroy();
      clientB?.destroy();
      clientA = undefined;
      clientB = undefined;
      rooms.forEach((room) => room.doc.destroy());
      rooms = new Map();
      resizeObserver.disconnect();
    },
  };
}
