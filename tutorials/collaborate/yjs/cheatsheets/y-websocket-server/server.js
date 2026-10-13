/**
 * server.js —— 可自托管的 y-websocket 服务端（官方参考实现的等价移植）。
 *
 * 演示内容：房间模型（每房间一份内存文档）、setupWSConnection 同款连接装配、
 *           upgrade 阶段鉴权、文件落盘持久化（bindState / writeState 契约）。
 * 前置状态：本工作区已装 yjs / y-protocols / ws / lib0；直接 `node server.js` 即可。
 * 主要操作：起服务后运行 `node check-sync.js` 验证双客户端互同步。
 * 预期结果：客户端互同步；服务端日志打印房间创建、连接进出与落盘；/status 可 curl。
 * 阅读主线：环境变量 → 持久化钩子 → RoomDoc（房间）→ 连接装配 → HTTP/upgrade 入口。
 *
 * 为什么不是 import '@y/websocket-server/utils'：本工作区安装的
 * @y/websocket-server@0.1.5 内部混用了两个不同构建的 yjs v14 预发布包
 * （yjs@14.0.0-16 与 @y/y@14.0.0-rc.7），客户端 update 在服务端 applyUpdate 时
 * 抛 `store.getClock is not a function`——握手能完成、内容却永远不同步。
 * 官方仓库本身就把这份实现定位为「拿去改成你自己的」（forkable reference），
 * 因此本文件把同一套机制落在工作区一致的 yjs 13 栈上：协议与线上字节完全兼容，
 * 钩子契约与官方 utils.js 逐条对应。版本分裂的判断与排查见 README 常见问题。
 */
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocket, WebSocketServer } from 'ws';

// ── 环境变量（与官方 bin 对齐）────────────────────────────────────────────
const host = process.env.HOST || 'localhost';
const port = Number(process.env.PORT || '1234');
// 设置后客户端必须用 ?token= 带上同一令牌，否则 upgrade 阶段直接拒绝
const authToken = process.env.AUTH_TOKEN || null;
// 设置后房间内容落盘到该目录；官方 README 许诺的 YPERSISTENCE 在 0.1.5
// 源码中被注释掉了，这里恢复同名约定
const persistenceDir = process.env.YPERSISTENCE || null;

const messageSync = 0;
const messageAwareness = 1;

// ── 持久化钩子（契约 = 官方 setPersistence 的 bindState / writeState）──────
// bindState：房间首次创建时调用，负责恢复历史内容；此处还挂了防抖增量写盘。
// writeState：房间最后一条连接关闭后调用，负责终态落盘；之后房间从内存销毁。
const persistence = persistenceDir
  ? {
      async bindState(docName, doc) {
        // 恢复期间的 update 不触发写盘，避免把刚读出的内容立刻写回去
        let restoring = true;
        let timer = null;
        doc.on('update', () => {
          if (restoring) return;
          // 增量兜底：每次变更后延迟合并写盘，进程被杀也不丢太多
          clearTimeout(timer);
          timer = setTimeout(() => persistence.writeState(docName, doc), 500);
        });
        const file = path.join(persistenceDir, `${encodeURIComponent(docName)}.yjs`);
        try {
          const data = await readFile(file);
          Y.applyUpdate(doc, new Uint8Array(data));
          console.log(`[持久化] 房间 ${docName} 从磁盘恢复 ${data.length} 字节`);
        } catch {
          // 文件不存在 = 新房间，从空文档开始
        } finally {
          restoring = false;
        }
      },
      async writeState(docName, doc) {
        await mkdir(persistenceDir, { recursive: true });
        const file = path.join(persistenceDir, `${encodeURIComponent(docName)}.yjs`);
        const state = Y.encodeStateAsUpdate(doc);
        await writeFile(file, state);
        console.log(`[持久化] 房间 ${docName} 落盘 ${state.length} 字节 → ${file}`);
      },
    }
  : null;

// ── 房间：一份内存中的共享文档 + 它的全部连接 ─────────────────────────────
class RoomDoc extends Y.Doc {
  constructor(name) {
    super({ gc: true });
    this.name = name;
    // conn → 该连接控制的 awareness clientID 集合，断连时统一摘除
    this.conns = new Map();
    // bindState 是异步的：官方 0.1.5 实现不等待它，首握手可能先看到空房间；
    // 这里把恢复完成挂到 whenReady，握手与消息处理都等它结束
    this.whenReady = Promise.resolve();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    this.awareness.on('update', ({ added, updated, removed }, conn) => {
      const changed = added.concat(updated, removed);
      if (conn !== null && this.conns.has(conn)) {
        const controlled = this.conns.get(conn);
        added.forEach((id) => controlled.add(id));
        removed.forEach((id) => controlled.delete(id));
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
      );
      this.broadcast(encoding.toUint8Array(encoder));
    });
    // 本地每次事务提交后，把增量 update 转发给房间内所有连接
    this.on('update', (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      this.broadcast(encoding.toUint8Array(encoder));
    });
  }

  broadcast(message) {
    this.conns.forEach((_, conn) => send(this, conn, message));
  }
}

// 内存房间注册表：房间只活在单进程内存里，这是水平扩展讨论的前提
const docs = new Map();

function getRoom(docName) {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new RoomDoc(docName);
    docs.set(docName, doc);
    doc.whenReady = Promise.resolve(persistence?.bindState(docName, doc));
    console.log(`[房间] 创建 ${docName}（当前 ${docs.size} 个房间）`);
  }
  return doc;
}

function send(doc, conn, message) {
  if (
    conn.readyState !== WebSocket.OPEN &&
    conn.readyState !== WebSocket.CONNECTING
  ) {
    closeConn(doc, conn);
    return;
  }
  conn.send(message, (err) => {
    if (err) closeConn(doc, conn);
  });
}

function closeConn(doc, conn) {
  if (doc.conns.has(conn)) {
    const controlled = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, [...controlled], null);
    console.log(`[连接] 离开 ${doc.name}（剩余 ${doc.conns.size} 条）`);
    if (doc.conns.size === 0) {
      // 空房回收：先落盘再销毁，下次有人进房时重新创建
      Promise.resolve(persistence?.writeState(doc.name, doc)).then(() => {
        doc.destroy();
      });
      docs.delete(doc.name);
      console.log(`[房间] 回收 ${doc.name}`);
    }
  }
  conn.close();
}

function handleMessage(conn, doc, message) {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    switch (decoding.readVarUint(decoder)) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness:
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
    }
  } catch (err) {
    console.error('[错误] 处理消息失败', err);
  }
}

// 与官方 setupWSConnection 等价的装配：进房 → 挂监听 → 保活 → 主动发起握手
function setupConnection(conn, req, { docName } = {}) {
  conn.binaryType = 'arraybuffer';
  const doc = getRoom(docName);
  doc.conns.set(conn, new Set());
  console.log(`[连接] 进入 ${docName}（当前 ${doc.conns.size} 条）`);

  // 恢复未完成的消息先排队，保证客户端不会与半个房间握手
  conn.on('message', (data) => {
    const message = new Uint8Array(data);
    doc.whenReady.then(() => handleMessage(conn, doc, message));
  });

  // 30 秒 ping/pong 保活：超时未 pong 的连接判定死亡并回收
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      closeConn(doc, conn);
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, 30000);
  conn.on('pong', () => {
    pongReceived = true;
  });
  conn.on('close', () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });

  // 服务端主动发 SyncStep1 + 全量 awareness，握手由这条消息启动；
  // 等恢复完成再发，客户端首次握手就能看到落盘内容
  doc.whenReady.then(() => {
    if (conn.readyState !== WebSocket.OPEN) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
    if (doc.awareness.getStates().size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          [...doc.awareness.getStates().keys()],
        ),
      );
      send(doc, conn, encoding.toUint8Array(awarenessEncoder));
    }
  });
}

// ── HTTP 服务与 upgrade 入口（鉴权位置）──────────────────────────────────
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', (conn, req) => {
  // 房间名 = URL 路径去掉前导斜杠，query 不进房间名（与官方实现一致）
  const docName = (req.url || '').slice(1).split('?')[0];
  setupConnection(conn, req, { docName });
});

const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    // 观测内存房间：curl http://localhost:1234/status
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        rooms: [...docs.values()].map((doc) => ({
          name: doc.name,
          connections: doc.conns.size,
          bytes: Y.encodeStateAsUpdate(doc).length,
        })),
      }),
    );
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});

server.on('upgrade', (req, socket, head) => {
  // 鉴权位置：拿到 cookie / query / header 的地方就是这里。
  // 注意浏览器 JS 拿不到 upgrade 失败的 HTTP 状态码——拒绝只表现为连接失败；
  // 需要向客户端传达原因时，应接受连接后立刻用 4401 等关闭码关闭（见 README）。
  if (authToken) {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    if (token !== authToken) {
      console.log(`[鉴权] 拒绝 ${req.url}：令牌缺失或不匹配`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(port, host, () => {
  console.log(`y-websocket 服务端运行在 ws://${host}:${port}`);
  console.log(`鉴权：${authToken ? '开启（客户端需带 ?token=）' : '关闭（设 AUTH_TOKEN 开启）'}`);
  console.log(`持久化：${persistenceDir ? `落盘到 ${persistenceDir}` : '关闭（设 YPERSISTENCE 开启）'}`);
});
