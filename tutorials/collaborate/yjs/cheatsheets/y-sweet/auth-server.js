/**
 * auth-server.js —— y-sweet 接入链路里的「应用服务端」：客户端令牌签发服务。
 *
 * 前置状态：y-sweet 服务器已在运行（npx y-sweet serve …），本进程持有它的连接字符串。
 * 主要操作：监听 POST /api/auth，body 为 { docId }；先做业务鉴权（此处用环境变量白名单
 *           演示），通过后经 DocumentManager 向 y-sweet 换取 ClientToken，原样返回 JSON。
 * 预期结果：白名单内的 docId 返回 { url, baseUrl, docId, ... }；白名单外返回 403，
 *           客户端侧停留在 connecting / error 循环——授权边界就在这个端点上。
 * 阅读主线：连接字符串 → DocumentManager → 业务鉴权 → 签发 → 响应。
 *
 * 用法：
 *   node auth-server.js                                  # ys://127.0.0.1:8080，监听 3002
 *   CONNECTION_STRING=ys://127.0.0.1:8080 AUTH_PORT=3002 node auth-server.js
 *   ALLOWED_DOCS=doc-a,doc-b node auth-server.js         # 只允许这两个文档
 */
import { createServer } from 'node:http';
import { DocumentManager } from '@y-sweet/sdk';

// 连接字符串 = y-sweet 服务器地址 + 可选的服务端令牌（ys://[token@]host:port）。
// 本地开发服务默认无鉴权，直接用 ys://127.0.0.1:8080；生产用 yss://（https）。
const connectionString =
  process.env.CONNECTION_STRING ?? 'ys://127.0.0.1:8080';
const port = Number(process.env.AUTH_PORT ?? 3002);
// 演示用的业务鉴权：逗号分隔的 docId 白名单；不设置表示放行全部。
const allowedDocs = process.env.ALLOWED_DOCS
  ? new Set(process.env.ALLOWED_DOCS.split(','))
  : null;

const manager = new DocumentManager(connectionString);

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/auth') {
    res.writeHead(404).end('not found');
    return;
  }

  const body = await readJson(req);
  const docId = body?.docId;
  if (typeof docId !== 'string' || docId.length === 0) {
    res.writeHead(400).end('docId required');
    return;
  }

  // 业务鉴权点：真实项目在这里校验登录态与文档访问权限，不通过就不要签发
  if (allowedDocs && !allowedDocs.has(docId)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    // 文档不存在则创建，然后为它签发客户端令牌；可传第二个参数
    // { authorization: 'read-only', validForSeconds: 3600 } 收窄权限与有效期
    const clientToken = await manager.getOrCreateDocAndToken(docId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(clientToken));
  } catch (err) {
    res.writeHead(502).end(`y-sweet 不可达：${err.message}`);
  }
});

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
  });
}

server.listen(port, () => {
  console.log(`令牌签发服务就绪：http://127.0.0.1:${port}/api/auth`);
  console.log(`y-sweet 连接字符串：${connectionString}`);
  console.log(`白名单：${allowedDocs ? [...allowedDocs].join(', ') : '（未设置，放行全部）'}`);
});
