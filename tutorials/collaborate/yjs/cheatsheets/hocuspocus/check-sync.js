/**
 * check-sync.js —— 验证 Hocuspocus 服务端是否正常工作。
 *
 * 前置状态:已有 Hocuspocus 服务端在运行(本课 server.js)。
 * 主要操作:内置一个最小 Hocuspocus 协议客户端(每条消息带文档名前缀、
 *           建连先发 Auth 握手),依次跑三个阶段——
 *           阶段 1:双客户端连同一房间,A 写入、B 收,B 追加、A 收;
 *           阶段 2:错误令牌连接,断言收到 permission-denied;
 *           阶段 3:只读令牌(secret-bob)连接,断言写入被 SyncStatus(false) 拒收、
 *                  同房间读写客户端看不到这笔变更。
 *           设 EXPECT=<子串> 时进入验证模式:单客户端连接并断言内容包含 EXPECT
 *           (用于重启服务后核对落盘恢复)。
 * 预期结果:打印各阶段证据,退出码 0;任一断言失败退出码 1。
 * 阅读主线:MiniProvider(协议帧)→ 三个阶段的断言。
 *
 * 为什么不用 y-websocket 客户端:Hocuspocus 4.x 线协议是多路复用的
 * (消息以 varString 文档名开头,且必须先发 Auth 消息),y-websocket 的
 * WebsocketProvider 不发 Auth、也不带文档名前缀,两者不兼容(见 README 常见问题)。
 *
 * 用法:
 *   node check-sync.js                          # 连 ws://127.0.0.1:1234,随机房间
 *   ROOM=persist-demo node check-sync.js        # 固定房间(配合落盘验证)
 *   ROOM=persist-demo EXPECT='你好' node check-sync.js   # 验证模式:断言内容恢复
 *   TOKEN=secret-alice SERVER_URL=ws://127.0.0.1:1234 node check-sync.js
 */
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import WebSocket from 'ws';

const serverUrl = process.env.SERVER_URL ?? 'ws://127.0.0.1:1234';
const room = process.env.ROOM ?? `probe-${Math.random().toString(36).slice(2, 8)}`;
const token = process.env.TOKEN ?? 'secret-alice';
const expect = process.env.EXPECT ?? null;

// Hocuspocus 4.x 消息类型(外层 varString 文档名 + varUint 类型)
const MSG_SYNC = 0;
const MSG_AUTH = 2;
const MSG_SYNC_REPLY = 4;
const MSG_CLOSE = 7;
const MSG_SYNC_STATUS = 8;
// Auth 子类型
const AUTH_TOKEN = 0;
const AUTH_DENIED = 1;
const AUTH_OK = 2;

/**
 * 最小 Hocuspocus 协议客户端:只实现本测试用到的帧——
 * 出方向:Auth(token)→ SyncStep1 → 本地 update;入方向:Authenticated /
 * PermissionDenied / Sync(Step1·Step2·Update)/ SyncStatus / Close。
 */
class MiniProvider {
  constructor(docName, doc, authToken) {
    this.docName = docName;
    this.doc = doc;
    this.events = [];
    this.authenticated = null; // null=等待中,true/false=已有结论
    this.scope = null; // 'read-write' | 'readonly'
    this.denyReason = null;
    this.lastSyncStatus = null; // 服务端对本地最近一次写入的确认
    this.synced = false;

    this.ws = new WebSocket(`${serverUrl}/${docName}`);
    this.ws.binaryType = 'arraybuffer';
    this.ws.on('open', () => {
      this.events.push('open');
      this.sendAuth(authToken);
      // 与官方 provider 一致:发完令牌立刻发起同步握手,服务端会在
      // 鉴权通过后按到达顺序处理排队的消息
      this.sendSyncStep1();
    });
    this.ws.on('message', (data) => this.handleMessage(new Uint8Array(data)));
    this.ws.on('close', (code) => this.events.push(`close:${code}`));

    // 本地变更 → 上行;origin 为 'remote' 的是下行合入,过滤回声
    doc.on('update', (update, origin) => {
      if (origin === 'remote' || this.ws.readyState !== WebSocket.OPEN) return;
      const enc = this.startMessage(MSG_SYNC);
      syncProtocol.writeUpdate(enc, update);
      this.send(enc);
    });
  }

  startMessage(type) {
    const enc = encoding.createEncoder();
    encoding.writeVarString(enc, this.docName);
    encoding.writeVarUint(enc, type);
    return enc;
  }

  send(enc) {
    this.ws.send(encoding.toUint8Array(enc));
  }

  sendAuth(authToken) {
    const enc = this.startMessage(MSG_AUTH);
    encoding.writeVarUint(enc, AUTH_TOKEN);
    encoding.writeVarString(enc, authToken);
    this.send(enc);
  }

  sendSyncStep1() {
    const enc = this.startMessage(MSG_SYNC);
    syncProtocol.writeSyncStep1(enc, this.doc);
    this.send(enc);
  }

  handleMessage(u8) {
    const dec = decoding.createDecoder(u8);
    decoding.readVarString(dec); // 文档名地址,本客户端一条连接只挂一个文档
    const type = decoding.readVarUint(dec);

    if (type === MSG_AUTH) {
      const sub = decoding.readVarUint(dec);
      if (sub === AUTH_OK) {
        this.scope = decoding.readVarString(dec);
        this.authenticated = true;
        this.events.push(`authenticated:${this.scope}`);
      } else if (sub === AUTH_DENIED) {
        this.denyReason = decoding.readVarString(dec);
        this.authenticated = false;
        this.events.push(`permission-denied:${this.denyReason}`);
        this.ws.close();
      }
      return;
    }

    if (type === MSG_SYNC || type === MSG_SYNC_REPLY) {
      const enc = this.startMessage(MSG_SYNC);
      const prefixLength = encoding.length(enc);
      // 服务端对 SyncStep1/2 与 Update 的标准三段应答,回复写进 enc
      syncProtocol.readSyncMessage(dec, enc, this.doc, 'remote');
      if (encoding.length(enc) > prefixLength) this.send(enc);
      if (!this.synced) {
        this.synced = true;
        this.events.push('synced');
      }
      return;
    }

    if (type === MSG_SYNC_STATUS) {
      // 只读连接的写入会被拒:false
      this.lastSyncStatus = decoding.readVarUint(dec) === 1;
      this.events.push(`sync-status:${this.lastSyncStatus}`);
      return;
    }

    if (type === MSG_CLOSE) {
      this.events.push(`server-close:${decoding.readVarString(dec)}`);
    }
    // awareness(1)等其余帧本测试不关心
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // 已关闭
    }
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(cond, label, timeout = 8000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) throw new Error(`超时等待:${label}`);
    await wait(50);
  }
}

function fail(message, ...providers) {
  console.error(`RESULT: FAIL —— ${message}`);
  for (const [name, p] of providers) {
    console.error(`${name} 事件序列:${p.events.join(' → ') || '(无)'}`);
  }
  process.exit(1);
}

// ── 验证模式:重启服务后核对落盘内容是否恢复 ──────────────────────────────
async function expectMode() {
  const doc = new Y.Doc();
  const provider = new MiniProvider(room, doc, token);
  const text = doc.getText('shared');
  try {
    await waitFor(() => provider.authenticated === true, '鉴权通过');
    await waitFor(() => provider.synced, '完成同步握手');
    await waitFor(
      () => text.toString().includes(expect),
      `内容包含「${expect}」`,
    );
    console.log(`连接地址:${serverUrl}/${room}`);
    console.log(`事件序列:${provider.events.join(' → ')}`);
    console.log(`恢复内容:${text.toString()}`);
    console.log('RESULT: OK');
    provider.close();
    process.exit(0);
  } catch (err) {
    fail(err.message, ['P', provider]);
  }
}

// ── 阶段 1:双客户端互同步 ────────────────────────────────────────────────
async function phaseSync() {
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const a = new MiniProvider(room, docA, token);
  const b = new MiniProvider(room, docB, token);
  const textA = docA.getText('shared');
  const textB = docB.getText('shared');

  await waitFor(
    () => a.authenticated === true && b.authenticated === true,
    '两端鉴权通过',
  );
  await waitFor(() => a.synced && b.synced, '两端完成握手');

  textA.insert(0, '你好,Hocuspocus!');
  await waitFor(() => textB.toString() === textA.toString(), 'B 收到 A 的文本');

  textB.insert(textB.length, ' —— 来自 B 的追加');
  await waitFor(() => textA.toString() === textB.toString(), 'A 收到 B 的追加');

  console.log('── 阶段 1:双客户端互同步 ──');
  console.log(`房间:${serverUrl}/${room}`);
  console.log(`A 事件:${a.events.join(' → ')}`);
  console.log(`B 事件:${b.events.join(' → ')}`);
  console.log(`两端一致:${textA.toString() === textB.toString()}`);
  console.log(`最终内容:${textA.toString()}`);

  const finalText = textA.toString();
  a.close();
  b.close();
  // 等末连接断开触发的落盘日志出现(unloadImmediately 立即执行 onStoreDocument)
  await wait(300);
  return finalText;
}

// ── 阶段 2:错误令牌被拒 ──────────────────────────────────────────────────
async function phaseDenied() {
  const doc = new Y.Doc();
  const bad = new MiniProvider(`${room}-deny`, doc, 'wrong-token');
  await waitFor(() => bad.authenticated === false, '收到 permission-denied');

  console.log('── 阶段 2:错误令牌 ──');
  console.log(`事件序列:${bad.events.join(' → ')}`);
  if (bad.denyReason !== 'permission-denied') {
    fail(`拒绝原因不符合预期:${bad.denyReason}`, ['BAD', bad]);
  }
  if (doc.getText('shared').toString() !== '') {
    fail('被拒连接不应拿到任何文档内容', ['BAD', bad]);
  }
  console.log('被拒后文档内容为空:是');
}

// ── 阶段 3:只读令牌的写入被拒收 ──────────────────────────────────────────
async function phaseReadOnly() {
  const docWriter = new Y.Doc();
  const docBob = new Y.Doc();
  const roRoom = `${room}-ro`;
  const writer = new MiniProvider(roRoom, docWriter, token);
  const bob = new MiniProvider(roRoom, docBob, 'secret-bob');
  const textWriter = docWriter.getText('shared');
  const textBob = docBob.getText('shared');

  await waitFor(
    () => writer.authenticated === true && bob.authenticated === true,
    '两端鉴权通过',
  );
  if (bob.scope !== 'readonly') {
    fail(`Bob 的权限范围应为 readonly,实际:${bob.scope}`, ['B', bob]);
  }
  await waitFor(() => writer.synced && bob.synced, '两端完成握手');

  // Bob 本地写入:本地文档立即生效,但服务端应回 SyncStatus(false) 且不转发
  textBob.insert(0, 'Bob 的非法写入');
  await waitFor(() => bob.lastSyncStatus === false, '服务端拒收(sync-status:false)');
  await wait(500); // 给潜在的转发留时间

  console.log('── 阶段 3:只读令牌 ──');
  console.log(`Bob 事件:${bob.events.join(' → ')}`);
  console.log(`读写端是否看到 Bob 的写入:${textWriter.toString().includes('Bob')}`);
  if (textWriter.toString().includes('Bob')) {
    fail('只读连接的写入被服务端接受并转发了', ['W', writer], ['B', bob]);
  }
  writer.close();
  bob.close();
  await wait(300);
}

async function main() {
  try {
    await phaseSync();
    await phaseDenied();
    await phaseReadOnly();
    console.log('RESULT: OK');
    process.exit(0);
  } catch (err) {
    console.error(`RESULT: FAIL —— ${err.message}`);
    process.exit(1);
  }
}

if (expect !== null) {
  await expectMode();
} else {
  await main();
}
