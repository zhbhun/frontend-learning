/**
 * 冷文档压缩与中心库快照(课程 4.2 范例)
 * 演示内容:把一个房间在 Redis 里的 update 列表合并成单条全量 update,
 * 快照先落中心存储(此处用本地文件模拟 S3 / Postgres),再重建 Redis 列表。
 * 用法:node compact-doc.js <房间名>
 * 预期结果:`<房间名>:updates` 从 N 条变 1 条,snapshots/<房间名>.update 为可独立恢复文档的全量快照。
 *
 * 安全前提(必须满足):该房间当前没有任何实例 bindState。
 * 1.0.3 的时钟协议假定列表只增不减——在线实例记着旧的列表长度,
 * 列表一旦变短,之后发布的新长度超不过它的记忆,差量就永远拉不到(静默丢更新)。
 * 在线房间的压缩需要重写版(yhub)那种幂等 worker,见课程「落盘与压缩」一节。
 */
import { mkdir, writeFile } from 'fs/promises'
import Redis from 'ioredis'
import * as Y from 'yjs'

const docName = process.argv[2]
if (!docName) {
  console.error('用法: node compact-doc.js <房间名>')
  process.exit(1)
}

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
})

const key = `${docName}:updates`

const run = async () => {
  const updates = await redis.lrangeBuffer(key, 0, -1)
  if (updates.length === 0) {
    console.log(`房间 ${docName} 在 Redis 中没有内容,无需压缩`)
    return
  }

  // 合并为单条全量 update;Yjs 的 update 幂等,本作业可安全重跑
  const merged = Y.mergeUpdates(updates)

  // 先落盘、后动 Redis:列表被重建之前,中心库已有完整副本。
  // 真实部署把这里换成 s3.putObject(...) 或 Postgres 的 INSERT ... ON CONFLICT UPDATE。
  await mkdir('snapshots', { recursive: true })
  await writeFile(`snapshots/${docName}.update`, merged)

  // 单事务重建列表:删旧列表 + 写入合并结果
  await redis.multi().del(key).rpush(key, Buffer.from(merged)).exec()

  console.log(`房间 ${docName}: ${updates.length} 条 update 合并为 1 条,快照 ${merged.byteLength} 字节`)
}

run().finally(() => redis.quit())
