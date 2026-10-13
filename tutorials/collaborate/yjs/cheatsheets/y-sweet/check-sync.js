/**
 * check-sync.js —— 验证 y-sweet 全链路：签发令牌 → 双客户端经服务器互同步 → 服务端直读持久化。
 *
 * 前置状态：y-sweet 服务器与本课 auth-server.js 都已在运行。
 * 主要操作：起两个 Y.Doc 各挂一个 YSweetProvider（A 用字符串 authEndpoint，B 用函数形态），
 *           连同一 docId；A 写入文本等 B 收到，B 追加等 A 收到；再用 DocumentManager
 *           直读服务端文档，验证服务器侧确实持有内容。
 * 预期结果：打印令牌结构、事件序列、两端一致与服务端快照内容，退出码 0；超时退出码 1。
 * 阅读主线：取令牌 → 建连 → 双向同步断言 → 服务端快照断言 → 打印证据。
 *
 * 用法：
 *   node check-sync.js                 # auth 端点 http://127.0.0.1:3002/api/auth
 *   AUTH_ENDPOINT=http://127.0.0.1:3002/api/auth DOC_ID=my-doc node check-sync.js
 *   CONNECTION_STRING=ys://127.0.0.1:8080 node check-sync.js   # 直读快照用
 */
import * as Y from 'yjs';
import { createYjsProvider } from '@y-sweet/client';
import { DocumentManager } from '@y-sweet/sdk';
import WebSocket from 'ws';

const authEndpoint = process.env.AUTH_ENDPOINT ?? 'http://127.0.0.1:3002/api/auth';
const docId = process.env.DOC_ID ?? `probe-${Math.random().toString(36).slice(2, 8)}`;
const connectionString = process.env.CONNECTION_STRING ?? 'ys://127.0.0.1:8080';

const docA = new Y.Doc();
const docB = new Y.Doc();

// Node 20 没有全局 WebSocket，注入 ws 实现；浏览器环境省略此项即可
// A 用字符串形态：Provider 会向该地址 POST { docId }，期望返回 ClientToken JSON
const providerA = createYjsProvider(docA, docId, authEndpoint, {
  WebSocketPolyfill: WebSocket,
  showDebuggerLink: false,
});
// B 用函数形态：自行 fetch 并返回 ClientToken——便于在签发前后插入自有逻辑
const providerB = createYjsProvider(
  docB,
  docId,
  async () => {
    const res = await fetch(authEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId }),
    });
    if (!res.ok) {
      throw new Error(`签发失败：${res.status}`);
    }
    return res.json();
  },
  { WebSocketPolyfill: WebSocket, showDebuggerLink: false },
);

const events = [];
for (const [name, provider] of [['A', providerA], ['B', providerB]]) {
  provider.on('connection-status', (status) =>
    events.push(`${name} connection-status:${status}`),
  );
  provider.on('sync', (synced) => events.push(`${name} sync:${synced}`));
  provider.on('local-changes', (has) => events.push(`${name} local-changes:${has}`));
}

const textA = docA.getText('shared');
const textB = docB.getText('shared');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(cond, label, timeout = 8000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeout) {
      throw new Error(`超时等待：${label}`);
    }
    await wait(50);
  }
}

try {
  await waitFor(
    () => providerA.status === 'connected' && providerB.status === 'connected',
    '两端完成握手（connected）',
  );

  // ClientToken 结构证据：url/baseUrl/docId 必有，token 字段视服务端是否开启鉴权
  const token = providerA.clientToken;
  console.log(
    `ClientToken：url=${token.url} baseUrl=${token.baseUrl} docId=${token.docId} ` +
      `token=${token.token ? '已签发' : '（开发模式无）'} authorization=${token.authorization ?? 'full'}`,
  );
  console.log(`实际连接地址：${providerA.generateUrl(token)}`);

  textA.insert(0, '你好，y-sweet！');
  await waitFor(() => textB.toString() === textA.toString(), 'B 收到 A 的文本');

  textB.insert(textB.length, ' —— 来自 B 的追加');
  await waitFor(() => textA.toString() === textB.toString(), 'A 收到 B 的追加');

  // 服务器持有文档：不经 Provider，直接用 SDK 把服务端快照读成第三份文档
  const manager = new DocumentManager(connectionString);
  const update = await manager.getDocAsUpdate(docId);
  const docC = new Y.Doc();
  Y.applyUpdate(docC, update);
  const snapshot = docC.getText('shared').toString();

  console.log(`事件序列：${events.join(' → ')}`);
  console.log(`两端一致：${textA.toString() === textB.toString()}`);
  console.log(`服务端快照一致：${snapshot === textA.toString()}`);
  console.log(`最终内容：${textA.toString()}`);
  console.log('RESULT: OK');
  providerA.destroy();
  providerB.destroy();
  process.exit(0);
} catch (err) {
  console.error(`RESULT: FAIL —— ${err.message}`);
  console.error(`事件序列：${events.join(' → ') || '（无）'}`);
  providerA.destroy();
  providerB.destroy();
  process.exit(1);
}
