/**
 * 多实例协同服务端(课程 4.2 核心范例)
 * 演示内容:把房间状态从单进程内存搬进 Redis,让任意多个 y-websocket 服务端实例共享同一份文档。
 * 前置状态:可达的 Redis(如 `docker run -d -p 6379:6379 redis:7 redis-server --appendonly yes`)。
 * 主要操作:同一房间经负载均衡落到不同实例,update 经 Redis 列表与 pub/sub 时钟对齐。
 * 预期结果:两个进程(PORT=3001 / 3002)各自服务同名房间,客户端内容一致;awareness 不跨实例。
 * 阅读主线:setPersistence 接线 → upgrade 鉴权挂点 → setupWSConnection 接管房间生命周期 → 优雅退出。
 */
import http from 'http'
import WebSocket from 'ws'
import * as number from 'lib0/number'
import { setupWSConnection, setPersistence } from '@y/websocket-server/utils'
import { RedisPersistence } from 'y-redis'

const host = process.env.HOST || '0.0.0.0'
const port = number.parseInt(process.env.PORT || '1234')
const redisOpts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: number.parseInt(process.env.REDIS_PORT || '6379'),
}

// y-redis 持久化层:每个房间一条 `<房间名>:updates` 列表存全部增量,
// 同名 pub/sub 频道只发最新列表长度(时钟),其他实例凭时钟拉差量。
// 内部维护两条 Redis 连接(普通 + 订阅),因为订阅态连接不能再发其他命令。
const redisPersistence = new RedisPersistence({ redisOpts })

setPersistence({
  // 房间在本实例首次被打开时由 getYDoc 调用:把 Y.Doc 绑进 Redis(订阅频道并拉取存量)。
  // 注意它不会被 await——客户端可能先握到一轮空内容,随后经增量消息追平(必然收敛)。
  bindState: (docName, doc) => {
    redisPersistence.bindState(docName, doc)
  },
  // 房间在本实例最后一个连接断开、即将卸载时调用:必须解绑退订,
  // 否则同名房间重进时 bindState 会因重复绑定抛错(1.0.3 每个 RedisPersistence 同名只准绑一次)。
  writeState: async (docName, _doc) => {
    await redisPersistence.closeDoc(docName)
  },
})

const wss = new WebSocket.Server({ noServer: true })
wss.on('connection', setupWSConnection)

const server = http.createServer((_req, res) => {
  // 健康检查端点:供负载均衡器探活
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('okay')
})

server.on('upgrade', (request, socket, head) => {
  // 鉴权挂在这里:校验 cookie 或 query token,不通过直接 socket.destroy();
  // 鉴权逻辑不经过 Redis,房间通道没有任何访问控制。
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

server.listen(port, host, () => {
  console.log(`y-redis 实例启动: ws://${host}:${port}, redis=${redisOpts.host}:${redisOpts.port}`)
})

// 优雅退出:先停收连接,再断开 y-redis 的两条 Redis 连接(普通 + 订阅)
const shutdown = () => {
  wss.close()
  server.close()
  redisPersistence.destroy().then(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
