/**
 * 范例介绍：用三个真实 Awareness 实例（客户端 A、客户端 B、服务器房间）复现
 * Hocuspocus 的 awareness 接线、保活与过期语义。
 * 前置状态：A、B 各持一份 Y.Doc 与 Awareness，经内存房间（扮演服务器）互通；
 * 房间持有一份服务器侧 Awareness，构造后立即 setLocalState(null)，对应服务器实现。
 * 操作：「在线列表」场景修改昵称、切换正在编辑；「过期与离开路径」场景把
 * 「A 的连接」切到异常失联或正常下线，再切回连接中。
 * 预期结果：改名后两端与房间列表同帧更新；静置约 15 秒可见 awarenessUpdate 计数
 * 继续增长而 awarenessChange 不变（保活重播）；异常失联约 30 秒后房间按 timeout
 * 移除 A 并广播，B 端列表同步消失；恢复上行后 A 的下一次保活重播让它自动回归；
 * 正常下线（广播 null）立即消失，且不会像失联那样自动回归。
 * 阅读主线：Member 的上行监听（origin 不是自己才上行）→ Room 的应用、钩子计数与
 * 房间内广播 → 各端 applyAwarenessUpdate → 面板列表、活跃秒数读数与事件时间线。
 * 与真实链路的差异：传输层换成内存直连；编码、应用、15 秒重播、30 秒过期均为
 * y-protocols/awareness 的真实代码路径，计时使用真实时钟。
 */
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';

import { createRenderLoop } from '../../assets/canvas-runtime.js';

/** 客户端 A 的连接形态：连接中、异常失联（静默断上行）、正常下线（广播 null）。 */
export type LeaveMode = 'connected' | 'crashed' | 'left';

export type Scenario = 'presence' | 'expiry';

export interface AwarenessModelOptions {
  scenario: Scenario;
  /** 客户端 A 的昵称，写入 user.name。 */
  displayName: string;
  /** 客户端 A 的 editing 字段。 */
  editing: boolean;
  /** 客户端 A 的连接形态。 */
  leaveMode: LeaveMode;
}

/** 一个视图（A 端 / B 端 / 服务器房间）里看到的一个在线成员。 */
export interface PresenceRow {
  clientId: number;
  name: string;
  editing: boolean;
  /** 该视图距这个 client 最后一次状态到达的秒数。 */
  idleSeconds: number;
}

export interface AwarenessModelSnapshot {
  viewA: PresenceRow[];
  viewB: PresenceRow[];
  viewRoom: PresenceRow[];
  /** 客户端 A 的 clientID（读数用它对齐行）。 */
  aClientId: number;
  /** A 在服务器房间的最后活跃秒数；已被移除时为 null。 */
  idleASeconds: number | null;
  /** 服务器侧 onAwarenessUpdate 钩子累计触发次数。 */
  hookCount: number;
  /** 钩子最近一次的 transactionOrigin 分类。 */
  hookLastOrigin: string;
  /** A 端 awarenessChange 累计次数（仅真实增删改）。 */
  changeCount: number;
  /** A 端 awarenessUpdate 累计次数（含保活重播等全部协议更新）。 */
  updateCount: number;
  leaveMode: LeaveMode;
  /** 两端列表的 client 集合是否一致。 */
  listsMatch: boolean;
}

export interface AwarenessModelInstance {
  update(options: AwarenessModelOptions): void;
  dispose(): void;
}

/** y-protocols 的 awareness update 事件形状。 */
interface AwarenessUpdate {
  added: number[];
  updated: number[];
  removed: number[];
}

/** 客户端配色：A 蓝、B 橙。 */
const COLOR_A = '#4f7cff';
const COLOR_B = '#e8590c';

const FONT_TITLE = '600 13px ui-sans-serif, system-ui, sans-serif';
const FONT_BODY = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
const FONT_LABEL = '12px ui-sans-serif, system-ui, sans-serif';

function tail(clientId: number): string {
  return String(clientId).slice(-4);
}

/** 把 transactionOrigin 归类成可读标签，对应服务器钩子里的判断写法。 */
function classifyOrigin(origin: unknown): string {
  if (origin !== null && typeof origin === 'object' && 'source' in origin) {
    return String((origin as { source: unknown }).source);
  }
  if (origin === 'timeout') {
    return 'timeout';
  }
  if (origin === null || origin === undefined) {
    return '连接清理';
  }
  return String(origin);
}

/**
 * 内存房间：扮演 Hocuspocus 服务器上的文档。
 * 关键对应：构造后立即 setLocalState(null)（服务器自身不出现在任何在线列表）；
 * 收到客户端消息以 connection origin 应用；自身 awareness 的每次 update 都视为
 * 一次 onAwarenessUpdate 钩子触发，并把变更广播给房间内全部成员（含发送者回声，
 * y-protocols 的时钟比较让回声无害）。
 */
class Room {
  readonly doc = new Y.Doc();

  readonly awareness: Awareness;

  hookCount = 0;

  hookLastOrigin = '—';

  private members: Member[] = [];

  private readonly onEvent: (text: string) => void;

  constructor(onEvent: (text: string) => void) {
    this.onEvent = onEvent;
    this.awareness = new Awareness(this.doc);
    // 对应服务器实现：房间 awareness 不持有本地状态。
    this.awareness.setLocalState(null);
    this.awareness.on('update', this.handleUpdate);
  }

  register(member: Member): void {
    this.members.push(member);
  }

  /** 收到某成员的上行：以 connection origin 应用到房间 awareness。 */
  receive(sender: Member, payload: Uint8Array): void {
    applyAwarenessUpdate(this.awareness, payload, {
      source: 'connection',
      connection: sender,
    });
  }

  private handleUpdate = (update: AwarenessUpdate, origin: unknown): void => {
    // 每一次房间 awareness 的更新都对应一次服务器 onAwarenessUpdate 钩子：
    // 客户端写入、15 秒保活重播、30 秒 timeout 移除、连接关闭清理都会走到这里。
    this.hookCount += 1;
    this.hookLastOrigin = classifyOrigin(origin);

    const changedClients = [...update.added, ...update.updated, ...update.removed];
    if (update.removed.length > 0) {
      const reason = classifyOrigin(origin);
      update.removed.forEach((clientId) => {
        this.onEvent(`房间 removed #${tail(clientId)}（${reason}）`);
      });
    }
    if (update.added.length > 0) {
      update.added.forEach((clientId) => {
        this.onEvent(`房间 added #${tail(clientId)}`);
      });
    }

    // 对应服务器广播：房间内全部连接都收到，包括发送者自己的回声。
    // origin 用成员实例标记，成员据此跳过回声（对应 provider 的 origin === this）。
    const payload = encodeAwarenessUpdate(this.awareness, changedClients);
    for (const member of this.members) {
      applyAwarenessUpdate(member.awareness, payload, member);
    }
  };

  destroy(): void {
    this.awareness.destroy();
    this.doc.destroy();
  }
}

/** 房间成员：一份 Y.Doc 加一个 Awareness，对应一个 provider 托管的客户端。 */
class Member {
  readonly doc = new Y.Doc();

  readonly awareness: Awareness;

  changeCount = 0;

  updateCount = 0;

  private gateClosed = false;

  constructor(
    private readonly room: Room,
    readonly color: string,
  ) {
    this.awareness = new Awareness(this.doc);
    room.register(this);
    // 对应 provider 的 awarenessChange 事件：y-protocols 先发 change 后发 update，
    // 只有真实增删改（added / 深比较变化的 updated / removed）才触发 change。
    this.awareness.on('change', () => {
      this.changeCount += 1;
    });
    // 上行监听：对应 provider 的 awarenessUpdateHandler。
    // origin 是自己（网络回声）时跳过，只有本地产生或主动移除的状态才上行。
    this.awareness.on('update', this.handleUpdate);
  }

  /** 对应 provider.setAwarenessField('user', …)：字段级合并进本地状态。 */
  setUser(name: string): void {
    this.awareness.setLocalStateField('user', { name, color: this.color });
  }

  setEditing(editing: boolean): void {
    this.awareness.setLocalStateField('editing', editing);
  }

  /** 异常失联：只断上行，本地实例与内部保活继续运行。 */
  setGateClosed(closed: boolean): void {
    this.gateClosed = closed;
  }

  private handleUpdate = (update: AwarenessUpdate, origin: unknown): void => {
    // 对应 provider 的 awarenessUpdate 事件：每次协议更新都计数，含保活重播。
    this.updateCount += 1;

    if (origin === this) {
      return;
    }
    if (this.gateClosed) {
      return;
    }
    const changedClients = [...update.added, ...update.updated, ...update.removed];
    const payload = encodeAwarenessUpdate(this.awareness, changedClients);
    this.room.receive(this, payload);
  };

  destroy(): void {
    this.awareness.destroy();
    this.doc.destroy();
  }
}

function rowsOf(awareness: Awareness, now: number): PresenceRow[] {
  const rows: PresenceRow[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const metaState = awareness.meta.get(clientId);
    rows.push({
      clientId,
      name: typeof state?.user?.name === 'string' ? state.user.name : '（未命名）',
      editing: state?.editing === true,
      idleSeconds: metaState ? Math.max(0, (now - metaState.lastUpdated) / 1000) : 0,
    });
  });
  rows.sort((a, b) => a.clientId - b.clientId);
  return rows;
}

export function createAwarenessModel(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AwarenessModelSnapshot) => void,
): AwarenessModelInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let options: AwarenessModelOptions = {
    scenario: 'presence',
    displayName: '小明',
    editing: false,
    leaveMode: 'connected',
  };
  let disposed = false;
  const startAt = Date.now();
  const events: Array<{ at: number; text: string }> = [];

  function log(text: string): void {
    events.push({ at: Date.now(), text });
    if (events.length > 80) {
      events.shift();
    }
  }

  let room: Room | undefined;
  let memberA: Member | undefined;
  let memberB: Member | undefined;

  function snapshot(): AwarenessModelSnapshot {
    const now = Date.now();
    const viewA = memberA ? rowsOf(memberA.awareness, now) : [];
    const viewB = memberB ? rowsOf(memberB.awareness, now) : [];
    const viewRoom = room ? rowsOf(room.awareness, now) : [];
    const aClientId = memberA?.awareness.clientID ?? 0;
    const rowRoom = viewRoom.find((row) => row.clientId === aClientId);
    const ids = (rows: PresenceRow[]) => new Set(rows.map((row) => row.clientId));
    const setA = ids(viewA);
    const setB = ids(viewB);
    const listsMatch =
      setA.size === setB.size && [...setA].every((id) => setB.has(id));

    return {
      viewA,
      viewB,
      viewRoom,
      aClientId,
      idleASeconds: rowRoom ? rowRoom.idleSeconds : null,
      hookCount: room?.hookCount ?? 0,
      hookLastOrigin: room?.hookLastOrigin ?? '—',
      changeCount: memberA?.changeCount ?? 0,
      updateCount: memberA?.updateCount ?? 0,
      leaveMode: options.leaveMode,
      listsMatch,
    };
  }

  /** 把「A 的连接」控件切换落到真实协议路径上。 */
  function applyLeaveMode(prevMode: LeaveMode, nextMode: LeaveMode): void {
    if (!memberA) {
      return;
    }
    if (nextMode === 'crashed') {
      memberA.setGateClosed(true);
      log('A 异常失联：上行静默断开，无任何广播');
      return;
    }
    memberA.setGateClosed(false);
    if (prevMode === 'crashed') {
      log('恢复 A 上行：等待 A 的下一次保活重播（最长约 18 秒）');
    }
    if (nextMode === 'left' && prevMode !== 'left') {
      // 对应 provider.destroy() 与 pagehide 的真实清理路径。
      removeAwarenessStates(memberA.awareness, [memberA.awareness.clientID], 'page hide');
      log('A 正常下线：广播 null（page hide），各列表立即移除');
    }
    if (nextMode === 'connected' && prevMode === 'left') {
      // 真实场景：本地状态已置空，setLocalStateField 对空状态是静默 no-op，
      // 必须先用 setLocalState 重建，再 setAwarenessField 写字段。
      memberA.awareness.setLocalState({});
      memberA.awareness.setLocalStateField('user', {
        name: options.displayName,
        color: COLOR_A,
      });
      memberA.setEditing(options.editing);
      log('A 重新写入状态（真实场景需应用代码重建后再 setAwarenessField）');
    }
  }

  function build(): void {
    room = new Room(log);
    memberA = new Member(room, COLOR_A);
    memberB = new Member(room, COLOR_B);
    memberA.setUser(options.displayName);
    memberB.setUser('小红');
    log(`A #${tail(memberA.awareness.clientID)}、B #${tail(memberB.awareness.clientID)} 接入房间`);
  }

  function rebuild(): void {
    memberA?.destroy();
    memberB?.destroy();
    room?.destroy();
    memberA = undefined;
    memberB = undefined;
    room = undefined;
    events.length = 0;
    build();
  }

  // ---------- 以下为绘制外壳：面板、箭头与事件时间线 ----------

  function roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.arcTo(x + w, y, x + w, y + h, r);
    drawingContext.arcTo(x + w, y + h, x, y + h, r);
    drawingContext.arcTo(x, y + h, x, y, r);
    drawingContext.arcTo(x, y, x + w, y, r);
    drawingContext.closePath();
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    broken: boolean,
  ): void {
    drawingContext.save();
    drawingContext.strokeStyle = broken ? '#c92a2a' : '#4f7cff';
    drawingContext.fillStyle = drawingContext.strokeStyle;
    drawingContext.lineWidth = 1.5;
    if (broken) {
      drawingContext.setLineDash([5, 4]);
    }
    drawingContext.beginPath();
    drawingContext.moveTo(x1, y1);
    drawingContext.lineTo(x2, y2);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    for (const [tipX, direction] of [
      [x1, 1],
      [x2, -1],
    ] as const) {
      drawingContext.beginPath();
      drawingContext.moveTo(tipX, y1);
      drawingContext.lineTo(tipX + 7 * direction, y1 - 3.5);
      drawingContext.lineTo(tipX + 7 * direction, y1 + 3.5);
      drawingContext.closePath();
      drawingContext.fill();
    }
    drawingContext.restore();

    drawingContext.font = FONT_LABEL;
    drawingContext.fillStyle = broken ? '#c92a2a' : '#3b5bdb';
    const labelWidth = drawingContext.measureText(label).width;
    drawingContext.fillText(label, (x1 + x2) / 2 - labelWidth / 2, y1 - 7);
  }

  function drawRow(
    row: PresenceRow,
    x: number,
    y: number,
    maxWidth: number,
  ): void {
    const color = row.clientId === memberA?.awareness.clientID ? COLOR_A : COLOR_B;
    drawingContext.fillStyle = color;
    drawingContext.beginPath();
    drawingContext.arc(x + 5, y - 4, 4, 0, Math.PI * 2);
    drawingContext.fill();

    const editingMark = row.editing ? ' · 编辑中' : '';
    let text = `${row.name} #${tail(row.clientId)}${editingMark}`;
    if (drawingContext.measureText(text).width > maxWidth) {
      text = `${row.name} #${tail(row.clientId)}`;
    }
    drawingContext.fillStyle = '#334155';
    drawingContext.font = FONT_BODY;
    drawingContext.fillText(text, x + 15, y);

    const idle = `idle ${Math.floor(row.idleSeconds)}s`;
    drawingContext.fillStyle = row.idleSeconds >= 15 ? '#c92a2a' : '#94a3b8';
    drawingContext.font = FONT_LABEL;
    const idleWidth = drawingContext.measureText(idle).width;
    drawingContext.fillText(idle, x + maxWidth - idleWidth, y);
  }

  function drawPanel(
    row: PresenceRow[],
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    subline?: string,
  ): void {
    roundRectPath(x, y, w, h, 8);
    drawingContext.fillStyle = '#ffffff';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    drawingContext.stroke();

    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText(title, x + 12, y + 22);

    drawingContext.strokeStyle = '#edf1f8';
    drawingContext.beginPath();
    drawingContext.moveTo(x + 10, y + 32);
    drawingContext.lineTo(x + w - 10, y + 32);
    drawingContext.stroke();

    if (row.length === 0) {
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = FONT_BODY;
      drawingContext.fillText('（空）', x + 12, y + 54);
    } else {
      row.slice(0, 4).forEach((entry, index) => {
        drawRow(entry, x + 12, y + 54 + index * 20, w - 30);
      });
    }

    if (subline) {
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = FONT_LABEL;
      drawingContext.fillText(subline, x + 12, y + h - 10);
    }
  }

  function draw(): void {
    if (!room || !memberA || !memberB) {
      return;
    }
    const current = snapshot();
    const size = {
      width: Math.max(1, Math.floor(canvas.parentElement?.clientWidth ?? canvas.width ?? 1)),
      height: Math.max(1, Math.floor(canvas.parentElement?.clientHeight ?? canvas.height ?? 1)),
    };
    const width = Math.max(560, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const margin = 16;
    const gap = 58;
    const panelWidth = Math.max(150, (width - margin * 2 - gap * 2) / 3);
    const panelTop = 56;
    const panelHeight = 128;
    const leftX = margin;
    const centerX = leftX + panelWidth + gap;
    const rightX = centerX + panelWidth + gap;

    drawPanel(
      current.viewA,
      leftX,
      panelTop,
      panelWidth,
      panelHeight,
      '客户端 A',
      `awarenessUpdate ${current.updateCount} · change ${current.changeCount}`,
    );
    drawPanel(
      current.viewRoom,
      centerX,
      panelTop,
      panelWidth,
      panelHeight,
      '服务器房间',
      `onAwarenessUpdate ×${current.hookCount} · 最近 ${current.hookLastOrigin}`,
    );
    drawPanel(
      current.viewB,
      rightX,
      panelTop,
      panelWidth,
      panelHeight,
      '客户端 B',
      'onAwarenessChange → 在线列表',
    );

    drawArrow(
      leftX + panelWidth + 6,
      panelTop - 18,
      centerX - 6,
      panelTop - 18,
      options.leaveMode === 'crashed' ? '上行已断开' : '上行（回声也回来）',
      options.leaveMode === 'crashed',
    );
    drawArrow(
      centerX + panelWidth + 6,
      panelTop - 18,
      rightX - 6,
      panelTop - 18,
      '房间内广播（含回声）',
      false,
    );

    // 事件时间线：以服务器视角记录 added / removed 与关键操作。
    const timelineTop = panelTop + panelHeight + 14;
    const timelineHeight = height - timelineTop - margin;
    roundRectPath(margin, timelineTop, width - margin * 2, timelineHeight, 8);
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.fill();
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.stroke();

    drawingContext.fillStyle = '#172033';
    drawingContext.font = FONT_TITLE;
    drawingContext.fillText('事件时间线', margin + 12, timelineTop + 22);

    const lineSlots = Math.max(1, Math.floor((timelineHeight - 36) / 18));
    const visible = events.slice(-lineSlots);
    drawingContext.font = FONT_BODY;
    visible.forEach((entry, index) => {
      const elapsed = Math.max(0, (entry.at - startAt) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
      drawingContext.fillStyle = '#475569';
      drawingContext.fillText(`[${mm}:${ss}] ${entry.text}`, margin + 12, timelineTop + 44 + index * 18);
    });
  }

  build();
  draw();
  emit(snapshot());

  // 渲染循环：离屏或页面隐藏时自动暂停，dispose 时彻底停止。
  const renderLoop = createRenderLoop(canvas, () => {
    if (disposed) {
      return;
    }
    draw();
    emit(snapshot());
  });

  return {
    update(next) {
      if (disposed) {
        return;
      }
      const prev = options;
      options = { ...next };
      if (next.scenario !== prev.scenario) {
        rebuild();
        draw();
        emit(snapshot());
        return;
      }
      if (!memberA) {
        return;
      }
      if (next.displayName !== prev.displayName) {
        memberA.setUser(options.displayName);
        log(`A setLocalStateField user.name → ${options.displayName}`);
      }
      if (next.editing !== prev.editing) {
        memberA.setEditing(options.editing);
        log(`A setLocalStateField editing → ${options.editing ? 'true' : 'false'}`);
      }
      if (next.leaveMode !== prev.leaveMode) {
        applyLeaveMode(prev.leaveMode, next.leaveMode);
      }
      draw();
      emit(snapshot());
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      renderLoop.dispose();
      memberA?.destroy();
      memberB?.destroy();
      room?.destroy();
      memberA = undefined;
      memberB = undefined;
      room = undefined;
    },
  };
}
