/**
 * server.js —— Hocuspocus 服务端完整范例(鉴权 + 落盘持久化 + 钩子日志)。
 *
 * 演示内容:new Server({...}) 一体化配置;onAuthenticate 校验令牌并返回 context,
 *           只读令牌降级 connectionConfig.readOnly;onLoadDocument / onStoreDocument
 *           文件落盘(v4 支持直接返回 Uint8Array);关键钩子打日志呈现生命周期。
 * 前置状态:工作区已装 @hocuspocus/server@4.7.1 与 yjs;Node >= 22(包 engines 要求)。
 * 主要操作:node cheatsheets/hocuspocus/server.js 起服务;
 *           另开终端 node cheatsheets/hocuspocus/check-sync.js 验证。
 * 预期结果:双客户端互同步;错误令牌收到 permission-denied;只读令牌的写入被拒;
 *           末连接断开后文档落盘,重启后从新连接恢复。
 * 阅读主线:环境变量 → 令牌表(onAuthenticate)→ 落盘两个钩子 → 日志钩子 → 启动。
 *
 * 注意:Hocuspocus 4.x 的线协议与 y-websocket 不兼容(每条消息带文档名前缀、
 * 连接必须先过 Auth 握手),浏览器端请用 @hocuspocus/provider;本工作区未安装它,
 * 故配套 check-sync.js 内置了一个最小协议客户端。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';

// ── 环境变量 ─────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || '1234');
const host = process.env.HOST || '127.0.0.1';
// 落盘目录:默认课程目录下的 data/;STORAGE_DIR 覆盖;STORAGE_DIR=off 关闭持久化
const storageDir =
  process.env.STORAGE_DIR === 'off'
    ? null
    : path.resolve(
        process.env.STORAGE_DIR ||
          fileURLToPath(new URL('./data/', import.meta.url)),
      );

// ── 演示令牌表(生产环境换成查库 / JWT 校验)───────────────────────────────
const TOKENS = {
  'secret-alice': { user: { id: 1, name: 'Alice' }, write: true },
  'secret-bob': { user: { id: 2, name: 'Bob' }, write: false },
};

const fileFor = (documentName) =>
  path.join(storageDir, `${encodeURIComponent(documentName)}.yjs`);

const server = new Server({
  port,
  address: host,

  // ── 鉴权:连接建立时校验令牌 ────────────────────────────────────────────
  // token 来自客户端 Auth 消息(@hocuspocus/provider 的 token 选项),
  // 不是 URL query;query 参数走 requestParameters,适合放辅助信息。
  async onAuthenticate({ token, documentName, connectionConfig }) {
    const account = TOKENS[token];
    if (!account) {
      console.log(`[鉴权] 拒绝文档 ${documentName}:令牌无效`);
      // throw 即拒绝:客户端收到 PermissionDenied(原因默认为 'permission-denied',
      // 想自定义原因可 throw { reason: 'token-expired' })
      throw new Error('invalid token');
    }
    if (!account.write) {
      // 只读降级:连接保留、能收不能写;服务端对它的 update 回 SyncStatus(false)
      connectionConfig.readOnly = true;
    }
    console.log(
      `[鉴权] ${account.user.name} 进入 ${documentName}(${account.write ? '读写' : '只读'})`,
    );
    // return 的对象并入 context:后续 onChange / onDisconnect 等钩子都能读到
    return { user: account.user };
  },

  // ── 持久化:房间首次加载恢复,变更后防抖落盘 ────────────────────────────
  // 触发时机:首条认证连接创建文档时;返回 Y.Doc 或 Uint8Array(v4 新增)即被合入
  async onLoadDocument({ documentName }) {
    if (!storageDir) return;
    try {
      const data = await readFile(fileFor(documentName));
      console.log(
        `[加载] 房间 ${documentName} 从磁盘恢复 ${data.length} 字节`,
      );
      return new Uint8Array(data);
    } catch {
      // 文件不存在 = 新房间,从空文档开始
    }
  },

  // 触发时机:每次变更后经 debounce(默认 2000ms)合并触发,maxDebounce
  // (默认 10000ms)兜底;末连接断开时立即执行一次(unloadImmediately 默认开),
  // server.destroy() 也会冲刷所有未落盘的防抖任务(stopOnSignals 默认接管信号)
  async onStoreDocument({ documentName, document }) {
    if (!storageDir) return;
    await mkdir(storageDir, { recursive: true });
    const state = Y.encodeStateAsUpdate(document);
    await writeFile(fileFor(documentName), state);
    console.log(
      `[落盘] 房间 ${documentName} 写入 ${state.length} 字节 → ${fileFor(documentName)}`,
    );
  },

  // ── 日志钩子:把生命周期打印出来当证据 ──────────────────────────────────
  async connected({ documentName, context, socketId }) {
    console.log(
      `[连接] ${context.user?.name ?? '(未识别)'} 已接入 ${documentName}(socket ${socketId.slice(0, 8)}…)`,
    );
  },

  async onChange({ documentName, update, context, clientsCount }) {
    console.log(
      `[变更] ${documentName} +${update.length} 字节(来自 ${context.user?.name ?? '服务端'},在线 ${clientsCount})`,
    );
  },

  async onDisconnect({ documentName, context, clientsCount }) {
    console.log(
      `[断开] ${context.user?.name ?? '(未识别)'} 离开 ${documentName}(剩余 ${clientsCount})`,
    );
  },

  async afterUnloadDocument({ documentName }) {
    console.log(`[卸载] 房间 ${documentName} 已从内存移除`);
  },
});

await server.listen();
console.log(`落盘目录:${storageDir ?? '关闭(设 STORAGE_DIR 开启)'}`);
console.log('演示令牌:secret-alice(读写)/ secret-bob(只读);Ctrl+C 优雅退出并落盘');
