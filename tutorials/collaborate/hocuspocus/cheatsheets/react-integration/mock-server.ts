/**
 * 范例支撑：在页面内扮演 Hocuspocus v4 服务器与 WebSocket 传输层，让真实的
 * @hocuspocus/provider-react 组件与 hooks 在没有真实服务器的文档页里跑通完整
 * 链路（连接、初始同步、awareness、断线重连补传）。
 * 前置状态：mock 服务器按文档名在内存中保存房间（Y.Doc + Awareness + 一位固定
 * 的远端用户）；「服务器可达」关闭时拒绝新连接并断开现有连接，恢复后由 provider
 * 的真实重连退避接管。
 * 操作：由课程正文的 Canvas Controls 驱动，本文件不直接交互。
 * 预期结果：客户端经历与真实服务器一致的消息流——sync step 1 换回 sync step 2、
 * 服务器确认后客户端 unsyncedChanges 归零、awareness 双向广播；断电后按退避
 * 重连，恢复时补传积压更新。
 * 阅读主线：FakeWebSocket 的最小表面（provider 只用到 addEventListener / send /
 * close / readyState）→ 房间初始同步与 SyncStatus 确认 → awareness 广播与远端
 * 用户 → 可达性开关。
 * 与真实链路的差异：传输层是页内对象而非网络 socket；不实现鉴权（真实服务器未
 * 配置 onAuthenticate 时对 Auth 消息同样不应答）；消息帧格式（文档名 + 类型 +
 * 载荷）与处理顺序对应 @hocuspocus/provider 4.7.1 的线上协议。
 */
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

/** 线上帧头类型，与 @hocuspocus/provider 4.7.1 的 MessageType 一致。 */
const MESSAGE_TYPE = {
  Sync: 0,
  Awareness: 1,
  Auth: 2,
  Close: 7,
  SyncStatus: 8,
} as const;

/** 服务器不可达时模拟的连接失败延迟，让「connecting」在时间线上可见。 */
const CONNECT_LATENCY_MS = 40;

/** 远端用户状态的重播间隔：对齐真实对端约 15 秒一次的重播节奏，防止过期。 */
const PEER_REBROADCAST_MS = 10_000;

type SocketListener = (event: unknown) => void;

/**
 * provider 对 WebSocket 的全部依赖只有这个表面：addEventListener /
 * removeEventListener / send / close / readyState / binaryType。
 * 真实的网络事件由 MockHocuspocusServer 通过 fire 触发。
 */
export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readonly url: string;

  identifier: number;

  binaryType = 'arraybuffer';

  readyState = FakeWebSocket.CONNECTING;

  private readonly listeners = new Map<string, Set<SocketListener>>();

  constructor(url: string, private server: MockHocuspocusServer) {
    this.url = url;
    this.identifier = server.nextSocketIdentifier();
    server.admit(this);
  }

  addEventListener(type: string, listener: SocketListener): void {
    const set = this.listeners.get(type) ?? new Set<SocketListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: SocketListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /** provider 只在 readyState 为 OPEN 时调用；收下的帧交给服务器处理。 */
  send(data: Uint8Array): void {
    if (this.readyState !== FakeWebSocket.OPEN) {
      return;
    }
    this.server.handleClientFrame(this, data);
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.server.drop(this);
    this.fire('close', { code: 1000, reason: 'client closed' });
  }

  /** 仅供 mock 服务器触发网络事件；事件对象只带 provider 会读取的字段。 */
  fire(type: 'open' | 'message' | 'close' | 'error', event: unknown): void {
    this.listeners.get(type)?.forEach((listener) => {
      listener(event);
    });
  }
}

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
}

/**
 * 页内 mock 服务器：按文档名保存房间，把真实 provider 发出的帧按 v4 协议处理。
 * 每个房间自带一位固定的远端用户（同事小李），让 useHocuspocusAwareness 有
 * 「别人在线」可观察。
 */
export class MockHocuspocusServer {
  online = true;

  private readonly rooms = new Map<string, Room>();

  private readonly roomSockets = new Map<string, Set<FakeWebSocket>>();

  private readonly sockets = new Set<FakeWebSocket>();

  private nextSocketId = 1;

  private rebroadcastTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.rebroadcastTimer = setInterval(() => {
      this.rebroadcastPeers();
    }, PEER_REBROADCAST_MS);
  }

  nextSocketIdentifier(): number {
    const id = this.nextSocketId;
    this.nextSocketId += 1;
    return id;
  }

  /** 交给 HocuspocusProviderWebsocket 的 WebSocketPolyfill（只需可构造）。 */
  websocketPolyfill(): new (url: string) => FakeWebSocket {
    const server = this;
    return class BoundFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url, server);
      }
    };
  }

  /** 切换服务器可达性：关闭即断开现有连接并拒绝后续尝试。 */
  setOnline(online: boolean): void {
    if (this.online === online) {
      return;
    }
    this.online = online;
    if (online) {
      return;
    }
    for (const socket of [...this.sockets]) {
      if (socket.readyState === FakeWebSocket.OPEN) {
        // 先置 CLOSED 再触发事件：provider 的 close 处理会回调 close()，避免重入
        socket.readyState = FakeWebSocket.CLOSED;
        socket.fire('close', { code: 4200, reason: 'mock server offline' });
      }
      this.drop(socket);
    }
  }

  dispose(): void {
    if (this.rebroadcastTimer) {
      clearInterval(this.rebroadcastTimer);
      this.rebroadcastTimer = null;
    }
    for (const socket of [...this.sockets]) {
      socket.close();
    }
    for (const room of this.rooms.values()) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        [room.doc.clientID],
        'mock server dispose',
      );
      room.awareness.destroy();
      room.doc.destroy();
    }
    this.rooms.clear();
    this.roomSockets.clear();
    this.sockets.clear();
  }

  /** 模拟三次握手：在线则延迟后打开连接，离线则报错关闭（触发真实重连退避）。 */
  admit(socket: FakeWebSocket): void {
    if (!this.online) {
      setTimeout(() => {
        if (socket.readyState !== FakeWebSocket.CONNECTING) {
          return;
        }
        socket.readyState = FakeWebSocket.CLOSED;
        socket.fire('error', new Error('mock server offline'));
        socket.fire('close', { code: 1006, reason: 'connection refused' });
      }, CONNECT_LATENCY_MS);
      return;
    }
    setTimeout(() => {
      if (socket.readyState !== FakeWebSocket.CONNECTING || !this.online) {
        return;
      }
      socket.readyState = FakeWebSocket.OPEN;
      this.sockets.add(socket);
      socket.fire('open', {});
    }, CONNECT_LATENCY_MS);
  }

  /** 连接关闭（无论哪一侧发起）时从所有广播名单移除。 */
  drop(socket: FakeWebSocket): void {
    this.sockets.delete(socket);
    for (const sockets of this.roomSockets.values()) {
      sockets.delete(socket);
    }
  }

  /** 处理客户端一帧：读「文档名 + 消息类型」帧头，按类型分派。 */
  handleClientFrame(socket: FakeWebSocket, data: Uint8Array): void {
    if (socket.readyState !== FakeWebSocket.OPEN || !this.online) {
      return;
    }

    const decoder = decoding.createDecoder(data);
    let documentName: string;
    let messageType: number;
    try {
      documentName = decoding.readVarString(decoder);
      messageType = decoding.readVarUint(decoder);
    } catch {
      return; // 单字节的连接级 Ping/Pong 不在本范例流程中
    }

    if (messageType === MESSAGE_TYPE.Close) {
      // provider 主动退出文档（切文档名/销毁）时发来，撤出广播名单即可
      this.roomSockets.get(documentName)?.delete(socket);
      return;
    }

    const room = this.roomFor(documentName);
    this.roomSockets.get(documentName)?.add(socket);

    if (messageType === MESSAGE_TYPE.Sync) {
      this.handleSync(socket, room, documentName, decoder);
      return;
    }

    if (messageType === MESSAGE_TYPE.Awareness) {
      this.handleAwareness(socket, room, documentName, decoder);
      return;
    }

    // Auth（未配置鉴权时不应答）、Stateless 等：本范例不处理
  }

  /**
   * 同步消息：sync step 1 回 sync step 2（房间内容补齐给新客户端）；客户端的
   * update / step 2 并入房间文档。随后发送 SyncStatus 确认——真实流程里这是
   * 「服务器回自己的 step 1 → 客户端回 step 2 → 服务器 ack」的最终结果，客户端
   * 据此把 unsyncedChanges 归零（useHocuspocusSyncStatus 的数据源）。
   */
  private handleSync(
    socket: FakeWebSocket,
    room: Room,
    documentName: string,
    decoder: decoding.Decoder,
  ): void {
    const reply = encoding.createEncoder();
    encoding.writeVarString(reply, documentName);
    encoding.writeVarUint(reply, MESSAGE_TYPE.Sync);
    const lengthBeforeReply = encoding.length(reply);
    syncProtocol.readSyncMessage(decoder, reply, room.doc, 'mock-server');

    if (encoding.length(reply) > lengthBeforeReply) {
      this.deliver(socket, encoding.toUint8Array(reply));
    }
    this.sendSyncStatus(socket, documentName, true);
  }

  /**
   * Awareness 消息：把客户端状态并入房间，再回房间内远端用户的状态——客户端的
   * useHocuspocusAwareness 因此能看到「本机用户 + 同事小李」两位在线。
   */
  private handleAwareness(
    socket: FakeWebSocket,
    room: Room,
    documentName: string,
    decoder: decoding.Decoder,
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(room.awareness, update, 'mock-server');

    const encoder = encoding.createEncoder();
    encoding.writeVarString(encoder, documentName);
    encoding.writeVarUint(encoder, MESSAGE_TYPE.Awareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, [
        room.doc.clientID,
      ]),
    );
    this.deliver(socket, encoding.toUint8Array(encoder));
  }

  /** 周期重播远端用户状态（clock 递增），对齐真实对端的保活节奏、防止过期。 */
  private rebroadcastPeers(): void {
    if (!this.online) {
      return;
    }
    for (const [documentName, sockets] of this.roomSockets) {
      if (sockets.size === 0) {
        continue;
      }
      const room = this.rooms.get(documentName);
      if (!room) {
        continue;
      }
      // setLocalState 会让 awareness clock +1，客户端据此刷新对端的新鲜度
      room.awareness.setLocalState({
        ...room.awareness.getLocalState(),
      });
      const frame = this.encodeAwarenessFrame(room, documentName);
      for (const socket of sockets) {
        this.deliver(socket, frame);
      }
    }
  }

  private encodeAwarenessFrame(room: Room, documentName: string): Uint8Array {
    const encoder = encoding.createEncoder();
    encoding.writeVarString(encoder, documentName);
    encoding.writeVarUint(encoder, MESSAGE_TYPE.Awareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, [
        room.doc.clientID,
      ]),
    );
    return encoding.toUint8Array(encoder);
  }

  private sendSyncStatus(
    socket: FakeWebSocket,
    documentName: string,
    applied: boolean,
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarString(encoder, documentName);
    encoding.writeVarUint(encoder, MESSAGE_TYPE.SyncStatus);
    encoding.writeVarUint(encoder, applied ? 1 : 0);
    this.deliver(socket, encoding.toUint8Array(encoder));
  }

  /** 按文档名取（或建）房间；房间在服务器存活期间持久保存内容。 */
  private roomFor(documentName: string): Room {
    const existing = this.rooms.get(documentName);
    if (existing) {
      if (!this.roomSockets.has(documentName)) {
        this.roomSockets.set(documentName, new Set());
      }
      return existing;
    }

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalState({ name: '同事小李', color: '#96ceb4' });
    const room: Room = { doc, awareness };
    this.rooms.set(documentName, room);
    this.roomSockets.set(documentName, new Set());
    return room;
  }

  /** 下行一帧：provider 只读事件对象里的 data（ArrayBuffer）。 */
  private deliver(socket: FakeWebSocket, frame: Uint8Array): void {
    socket.fire('message', { data: frame.slice().buffer });
  }
}
