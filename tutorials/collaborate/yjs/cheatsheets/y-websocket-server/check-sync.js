/**
 * check-sync.js —— 验证 y-websocket 服务端是否正常工作。
 *
 * 前置状态：已有一个 y-websocket 服务端在运行（官方 bin 或本课 server.js 均可）。
 * 主要操作：在同进程起两个 WebsocketProvider 连同一房间，A 写入文本，等 B 收到；
 *           再由 B 追加，等 A 收到；两端都设 disableBc，排除同进程近路干扰。
 * 预期结果：打印事件序列与两端一致的文本，退出码 0；任一环节超时退出码 1。
 * 阅读主线：命令行参数 → 建连 → 双向同步断言 → 打印证据。
 *
 * 用法：
 *   node check-sync.js                          # 连 ws://localhost:1234，随机房间
 *   SERVER_URL=ws://localhost:1234 node check-sync.js
 *   TOKEN=secret123 node check-sync.js          # 服务端开了鉴权时带上令牌
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocket from 'ws';

const serverUrl = process.env.SERVER_URL ?? 'ws://localhost:1234';
const room = process.env.ROOM ?? `probe-${Math.random().toString(36).slice(2, 8)}`;
// 鉴权令牌经 params 拼进连接 URL 的 query，服务端在 upgrade 阶段读取
const params = process.env.TOKEN ? { token: process.env.TOKEN } : {};

const docA = new Y.Doc();
const docB = new Y.Doc();

// Node 环境没有全局 WebSocket 时注入 ws 实现；disableBc 关闭 BroadcastChannel，
// 保证观察到的一致性只能来自服务器往返
const providerA = new WebsocketProvider(serverUrl, room, docA, {
  WebSocketPolyfill: WebSocket,
  disableBc: true,
  params,
});
const providerB = new WebsocketProvider(serverUrl, room, docB, {
  WebSocketPolyfill: WebSocket,
  disableBc: true,
  params,
});

const events = [];
for (const [name, provider] of [['A', providerA], ['B', providerB]]) {
  provider.on('status', ({ status }) => events.push(`${name} status:${status}`));
  provider.on('sync', (synced) => events.push(`${name} sync:${synced}`));
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
  await waitFor(() => providerA.synced && providerB.synced, '两端完成握手（synced）');

  textA.insert(0, '你好，y-websocket 服务端！');
  await waitFor(() => textB.toString() === textA.toString(), 'B 收到 A 的文本');

  textB.insert(textB.length, ' —— 来自 B 的追加');
  await waitFor(() => textA.toString() === textB.toString(), 'A 收到 B 的追加');

  console.log(`连接地址：${providerA.url}`);
  console.log(`事件序列：${events.join(' → ')}`);
  console.log(`两端一致：${textA.toString() === textB.toString()}`);
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
