/**
 * 范例介绍:按 y-protocols 规范手写一个最小网络 Provider——BroadcastChannelProvider,
 * 并让两个 Y.Doc 各挂一个实例,经 BroadcastChannel 互通(同源直达、零网络、离线可运行)。
 *
 * 上半部分的 BroadcastChannelProvider 是本课交付物,可直接搬走。它做齐一个网络
 * Provider 必须做的四件事:
 *   ① 监听文档 update 事件,编码成协议帧广播(带 origin 回声过滤);
 *   ② 收到远端帧,交给 readSyncMessage / applyAwarenessUpdate 合入,回执原路发回;
 *   ③ 接入通道时发起 sync 握手(连发 SyncStep1 + SyncStep2 + QueryAwareness + awareness);
 *   ④ 转发 awareness 状态,断开时先广播自己的 null 帧再关通道。
 * 帧格式与 y-websocket 相同:外层 varUint 消息类型(0=sync / 1=awareness /
 * 3=queryAwareness),sync 帧内层再嵌一个 varUint(0=SyncStep1 / 1=SyncStep2 / 2=Update)。
 *
 * 下半部分 createProviderLab 是演示:两个文档面板 + 中间一条协议消息流水,
 * 逐条显示帧的方向、类型与真实字节数。
 * 输入:textA(文档 A 内容)/ connectedB(B 接入通道)/ filterEcho(回声过滤)/
 *      nameB(B 的用户名,写入 B 的 awareness)。
 * 预期:B 接入时出现 6 条握手消息;编辑 A 产生 1 条 Update 帧(关掉回声过滤变 2 条);
 *      断开再接入,B 经握手差量追平;改用户名产生 Awareness 帧;断开 B 时广播 null 帧,
 *      A 端在线列表立刻减一。
 * 阅读主线:class BroadcastChannelProvider(构造 → connect → receive → disconnect)
 *      → createProviderLab(装配两个实例与控件)→ draw。
 */
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// 外层消息类型,与 y-websocket 源码中的常量一致(2 = messageAuth,本课用不到)。
// 消息体不含房间名:房间由传输层寻址——这里是 BroadcastChannel 的通道名,
// 在 y-websocket 里是 WebSocket 的 URL。
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;
export const MESSAGE_QUERY_AWARENESS = 3;

export interface BroadcastChannelProviderOptions {
  /** 不传则新建;传入既有实例可与其他 Provider 共享在线状态。 */
  awareness?: awarenessProtocol.Awareness;
  /** 观测钩子:每收发一条协议帧回调一次,演示用它画消息流水。 */
  onTraffic?: (direction: 'out' | 'in', message: Uint8Array) => void;
}

/** awareness 'update' 事件载荷:本次发生变化的 clientID 列表。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

export class BroadcastChannelProvider {
  readonly channelName: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  private readonly onTraffic?: (
    direction: 'out' | 'in',
    message: Uint8Array,
  ) => void;

  /**
   * 回声过滤开关,默认开。远端 update 合入时会以本 Provider 为 origin 再触发
   * update 事件;不过滤会把同一条 update 又发回去——幂等性保证它一圈就停,
   * 但每条编辑多一条来回的帧。演示里可关掉观察回声。
   */
  filterEcho = true;
  /** 是否与对端完成过内容握手(收到过 SyncStep2)。 */
  synced = false;
  connected = false;
  private channel: BroadcastChannel | null = null;

  constructor(
    channelName: string,
    doc: Y.Doc,
    options: BroadcastChannelProviderOptions = {},
  ) {
    this.channelName = channelName;
    this.doc = doc;
    this.awareness = options.awareness ?? new awarenessProtocol.Awareness(doc);
    this.onTraffic = options.onTraffic;

    // 职责①:每个非空事务产生一条增量 update,编码为 [messageSync, Update] 帧广播。
    this.doc.on('update', this.handleDocUpdate);
    // 职责④(发出方向):awareness 每次写入(含 15 秒心跳与下线 null 帧)都触发
    // update 事件,把变化的客户端全量编码转发。change 事件听不到心跳,不能用它。
    this.awareness.on('update', this.handleAwarenessUpdate);
  }

  /** 接入通道并发起握手。重复调用安全。 */
  connect() {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.channel = new BroadcastChannel(this.channelName);
    this.channel.onmessage = (event: MessageEvent<Uint8Array>) => {
      this.receive(new Uint8Array(event.data));
    };

    // 职责③:对称通道的接入宣告(与 y-websocket connectBc 相同的四条)——
    // SyncStep1 带自己的 state vector,请对方回差量;
    // SyncStep2(不带 sv,即全量)把自己的状态推给对方,幂等合入;
    // QueryAwareness 索要全量在线状态。
    const encoderSync1 = encoding.createEncoder();
    encoding.writeVarUint(encoderSync1, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoderSync1, this.doc);
    this.send(encoding.toUint8Array(encoderSync1));

    const encoderSync2 = encoding.createEncoder();
    encoding.writeVarUint(encoderSync2, MESSAGE_SYNC);
    syncProtocol.writeSyncStep2(encoderSync2, this.doc);
    this.send(encoding.toUint8Array(encoderSync2));

    const encoderQuery = encoding.createEncoder();
    encoding.writeVarUint(encoderQuery, MESSAGE_QUERY_AWARENESS);
    this.send(encoding.toUint8Array(encoderQuery));

    // 第四条:广播自己的 awareness。这里用「续期」代替直接编码——对端按
    // 「时钟严格更新才接受」去重,下线时收到的 null 帧已记下当前时钟,
    // 重连若原样宣告会被忽略(要等最长 15 秒心跳自愈);setLocalState 推进
    // 时钟后经 update 事件走正常转发路径,立即恢复可见。
    this.awareness.setLocalState(this.awareness.getLocalState());
  }

  /** 先广播自己的 awareness null 帧再关通道;文档数据不受影响。 */
  disconnect() {
    if (!this.connected || !this.channel) {
      return;
    }
    // 职责④(下线清理):encodeAwarenessUpdate 第三参传空 Map,
    // states 查不到即编码为 null——「我下线了」靠这条 null 帧送达对端;
    // 对端没收到时还有 30 秒心跳过期兜底。
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        [this.doc.clientID],
        new Map(),
      ),
    );
    this.send(encoding.toUint8Array(encoder));

    this.connected = false;
    this.synced = false;
    this.channel.close();
    this.channel = null;
  }

  private send(data: Uint8Array) {
    this.channel?.postMessage(data);
    this.onTraffic?.('out', data);
  }

  /** 职责②:拆帧、按类型分发;readSyncMessage 写好的回执原路发回。 */
  private receive(data: Uint8Array) {
    this.onTraffic?.('in', data);
    const decoder = decoding.createDecoder(data);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case MESSAGE_SYNC: {
        // 回执帧预写外层类型;readSyncMessage 识别内层类型:
        // 收到 SyncStep1 会自动按对方 sv 编码 SyncStep2 写进 encoder,
        // 收到 SyncStep2 / Update 则以本 Provider 为 origin 合入(回声因此被过滤)。
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          this.doc,
          this,
        );
        if (syncType === syncProtocol.messageYjsSyncStep2) {
          this.synced = true;
        }
        break;
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this,
        );
        break;
      }
      case MESSAGE_QUERY_AWARENESS: {
        // 应答:全量编码当前已知(含自己)的在线状态。
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(
            this.awareness,
            Array.from(this.awareness.getStates().keys()),
          ),
        );
        break;
      }
      default:
        // 未知类型忽略——协议预留的扩展点(如 2=messageAuth)。
        return;
    }
    // encoder 只有 1 字节类型头时说明没有回执,不必发(y-websocket 同一判据)。
    if (encoding.length(encoder) > 1) {
      this.send(encoding.toUint8Array(encoder));
    }
  }

  /** 断开并摘除监听;doc 与 awareness 的数据原样保留。 */
  destroy() {
    this.disconnect();
    this.doc.off('update', this.handleDocUpdate);
    this.awareness.off('update', this.handleAwarenessUpdate);
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (!this.connected) {
      return;
    }
    if (origin === this && this.filterEcho) {
      return;
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    this.send(encoding.toUint8Array(encoder));
  };

  private handleAwarenessUpdate = (delta: AwarenessDelta) => {
    if (!this.connected) {
      return;
    }
    // removed 必须一起编码:states 里已无其条目,编码结果为 null 帧。
    const changed = delta.added.concat(delta.updated, delta.removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
    );
    this.send(encoding.toUint8Array(encoder));
  };
}

// ── 以下为演示装配 ─────────────────────────────────────────

export interface ProviderLabOptions {
  textA: string;
  connectedB: boolean;
  filterEcho: boolean;
  nameB: string;
}

export interface ProviderLabSnapshot {
  connectedB: boolean;
  syncedB: boolean;
  totalMessages: number;
  syncMessages: number;
  presenceMessages: number;
  lastMessage: string;
  consistent: boolean;
  onlineInA: string;
  channel: string;
}

export interface ProviderLabInstance {
  update(options: ProviderLabOptions): void;
  dispose(): void;
}

type MessageKind = 'sync' | 'awareness' | 'query';

interface LogEntry {
  dir: 'A→B' | 'B→A';
  label: string;
  kind: MessageKind;
  bytes: number;
}

const KIND_COLORS: Record<MessageKind, string> = {
  sync: '#4f7cff',
  awareness: '#9333ea',
  query: '#64748b',
};

const USER_A = { name: '阿宁', color: '#4f7cff' };
const COLOR_B = '#d97706';

/** 解析一条帧的类型标签:外层 varUint,sync 帧再读内层 varUint。 */
function describeMessage(data: Uint8Array): { label: string; kind: MessageKind } {
  const decoder = decoding.createDecoder(data);
  const outer = decoding.readVarUint(decoder);
  if (outer === MESSAGE_SYNC) {
    const inner = decoding.readVarUint(decoder);
    const label =
      inner === syncProtocol.messageYjsSyncStep1
        ? 'SyncStep1'
        : inner === syncProtocol.messageYjsSyncStep2
          ? 'SyncStep2'
          : 'Update';
    return { label, kind: 'sync' };
  }
  if (outer === MESSAGE_AWARENESS) {
    return { label: 'Awareness', kind: 'awareness' };
  }
  return { label: 'QueryAwareness', kind: 'query' };
}

interface PresenceUser {
  name: string;
  color: string;
}

function userOf(state: unknown): PresenceUser | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }
  const user = (state as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null) {
    return null;
  }
  const { name, color } = user as { name?: unknown; color?: unknown };
  if (typeof name !== 'string' || typeof color !== 'string') {
    return null;
  }
  return { name, color };
}

export function createProviderLab(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ProviderLabSnapshot) => void,
): ProviderLabInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const g: CanvasRenderingContext2D = context;

  // 通道名带随机后缀,避免与同时打开的本页其他副本串话。
  const channel = `cheatsheet-custom-provider-${Math.random().toString(36).slice(2, 10)}`;

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const textA = docA.getText('t');
  const textB = docB.getText('t');

  const log: LogEntry[] = [];
  let totalMessages = 0;
  let syncMessages = 0;
  let presenceMessages = 0;

  function record(dir: 'A→B' | 'B→A', data: Uint8Array) {
    const { label, kind } = describeMessage(data);
    totalMessages += 1;
    if (kind === 'sync') {
      syncMessages += 1;
    } else {
      presenceMessages += 1;
    }
    log.push({ dir, label, kind, bytes: data.byteLength });
    if (log.length > 60) {
      log.shift();
    }
    draw();
  }

  const providerA = new BroadcastChannelProvider(channel, docA, {
    onTraffic: (dir, data) => {
      if (dir === 'out') {
        record('A→B', data);
      }
    },
  });
  const providerB = new BroadcastChannelProvider(channel, docB, {
    onTraffic: (dir, data) => {
      if (dir === 'out') {
        record('B→A', data);
      }
    },
  });

  // 面板内容、在线列表变化都会触发重绘:文档 update、awareness update、收发帧。
  docA.on('update', draw);
  docB.on('update', draw);
  providerA.awareness.on('update', draw);
  providerB.awareness.on('update', draw);

  providerA.awareness.setLocalState({ user: USER_A });
  // A 是在线的固定端,创建即接入;B 由「B 接入通道」控件控制。
  providerA.connect();

  let currentNameB = '';

  function setNameB(name: string) {
    if (name === currentNameB) {
      return;
    }
    currentNameB = name;
    providerB.awareness.setLocalState({ user: { name, color: COLOR_B } });
  }

  function setConnectedB(next: boolean) {
    if (next === providerB.connected) {
      return;
    }
    if (next) {
      providerB.connect();
    } else {
      providerB.disconnect();
    }
  }

  function setTextA(text: string) {
    if (textA.toString() === text) {
      return;
    }
    docA.transact(() => {
      textA.delete(0, textA.length);
      if (text.length > 0) {
        textA.insert(0, text);
      }
    });
  }

  function presenceNames(aw: awarenessProtocol.Awareness): string {
    const names: string[] = [];
    aw.getStates().forEach((state, clientID) => {
      const user = userOf(state);
      if (user) {
        names.push(clientID === aw.clientID ? `${user.name}(我)` : user.name);
      }
    });
    return names.length > 0 ? names.join(', ') : '(空)';
  }

  function snapshot(): ProviderLabSnapshot {
    const last = log.at(-1);
    return {
      connectedB: providerB.connected,
      syncedB: providerB.synced,
      totalMessages,
      syncMessages,
      presenceMessages,
      lastMessage: last ? `${last.dir} ${last.label} · ${last.bytes} B` : '(暂无)',
      consistent: textA.toString() === textB.toString(),
      onlineInA: presenceNames(providerA.awareness),
      channel,
    };
  }

  function drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ) {
    g.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#172033';
    let line = '';
    let cy = y;
    let drawn = 0;
    const flush = (content: string) => {
      g.fillText(content, x, cy);
      cy += lineHeight;
      drawn += 1;
    };
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxWidth && line !== '') {
        if (drawn === maxLines - 1) {
          flush(`${line} …`);
          return;
        }
        flush(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line !== '' || drawn === 0) {
      flush(line === '' ? '(空)' : line);
    }
  }

  function drawPanel(
    x: number,
    top: number,
    width: number,
    bottom: number,
    title: string,
    text: string,
    aw: awarenessProtocol.Awareness,
    active: boolean,
  ) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = active ? '#cbd5e1' : '#e2e8f0';
    g.setLineDash(active ? [] : [5, 4]);
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();
    g.setLineDash([]);

    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText(title, x + 12, top + 18);

    const maxLines = Math.max(1, Math.floor((bottom - top - 76) / 20));
    drawWrappedText(text, x + 12, top + 42, width - 24, 20, maxLines);

    // 面板底部:该端 awareness 视角下的在线列表(彩色点 + 名字)。
    let dotX = x + 16;
    const dotY = bottom - 16;
    aw.getStates().forEach((state, clientID) => {
      const user = userOf(state);
      if (!user) {
        return;
      }
      g.fillStyle = user.color;
      g.beginPath();
      g.arc(dotX, dotY - 3, 4, 0, Math.PI * 2);
      g.fill();
      g.font = '11px ui-sans-serif, system-ui, sans-serif';
      const label = clientID === aw.clientID ? `${user.name}(我)` : user.name;
      g.fillText(label, dotX + 8, dotY);
      dotX += 16 + g.measureText(label).width;
    });
    if (aw.getStates().size === 0) {
      g.font = '11px ui-sans-serif, system-ui, sans-serif';
      g.fillStyle = '#94a3b8';
      g.fillText('(无在线客户端)', x + 12, dotY);
    }
  }

  function drawLog(x: number, top: number, width: number, bottom: number) {
    g.fillStyle = '#f8fafc';
    g.strokeStyle = '#cbd5e1';
    g.beginPath();
    g.rect(x, top, width, bottom - top);
    g.fill();
    g.stroke();

    g.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = '#64748b';
    g.fillText('协议消息(新→旧)', x + 10, top + 17);

    const lineHeight = 18;
    const maxLines = Math.max(1, Math.floor((bottom - top - 34) / lineHeight));
    const visible = log.slice(-maxLines).reverse();
    if (visible.length === 0) {
      g.font = '11px ui-sans-serif, system-ui, sans-serif';
      g.fillStyle = '#94a3b8';
      g.fillText('(暂无消息)', x + 10, top + 40);
      return;
    }
    visible.forEach((entry, index) => {
      const y = top + 38 + index * lineHeight;
      g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillStyle = KIND_COLORS[entry.kind];
      g.fillText(`${entry.dir} ${entry.label}`, x + 10, y);
      g.fillStyle = '#94a3b8';
      g.textAlign = 'right';
      g.fillText(`${entry.bytes} B`, x + width - 10, y);
      g.textAlign = 'left';
    });
  }

  function fitText(text: string, maxWidth: number): string {
    if (g.measureText(text).width <= maxWidth) {
      return text;
    }
    let out = text;
    while (out.length > 0 && g.measureText(`${out} …`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out} …`;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    g.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    g.clearRect(0, 0, width, height);

    const panelTop = 44;
    const panelBottom = height - 64;
    const logWidth = 240;
    const logX = width / 2 - logWidth / 2;
    const panelWidth = (width - 32 - logWidth - 24) / 2;

    drawPanel(
      16,
      panelTop,
      panelWidth,
      panelBottom,
      '文档 A',
      textA.toString(),
      providerA.awareness,
      true,
    );
    drawPanel(
      width - 16 - panelWidth,
      panelTop,
      panelWidth,
      panelBottom,
      `文档 B · ${providerB.connected ? (providerB.synced ? '已接入 · synced' : '已接入') : '已断开'}`,
      textB.toString(),
      providerB.awareness,
      providerB.connected,
    );
    drawLog(logX, panelTop, logWidth, panelBottom);

    // 底部状态行:一致性 + 通道名。
    const { consistent } = snapshot();
    g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = consistent ? '#059669' : '#d97706';
    g.textAlign = 'center';
    g.fillText(
      consistent
        ? '两端一致'
        : '已分叉 —— 重新接入 B 后经握手差量追平',
      width / 2,
      height - 40,
    );
    g.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillStyle = '#94a3b8';
    g.fillText(fitText(`通道:${channel}(零网络,同源直达)`, width - 32), width / 2, height - 18);
    g.textAlign = 'left';

    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      providerA.filterEcho = options.filterEcho;
      providerB.filterEcho = options.filterEcho;
      setNameB(options.nameB);
      setConnectedB(options.connectedB);
      setTextA(options.textA);
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      providerA.destroy();
      providerB.destroy();
      docA.destroy();
      docB.destroy();
    },
  };
}
