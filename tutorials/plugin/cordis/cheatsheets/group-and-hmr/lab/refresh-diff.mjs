// 实验：清单热更新的两级判等——include 先比较文件内容，树再按 id 深比较。
// 对照两份内容等价、仅 id 有无不同的清单，各自追加一行注释后 refresh()：
// 无 id 清单全量重启，有 id 清单无任何启停。
// 注意：include 插件按类在 registry 去重，两份清单必须各自独立进程运行：
//   node refresh-diff.mjs ./app.yml        # 手写无 id → 全量重启
//   node refresh-diff.mjs ./with-ids.yml   # 带 id → 深比较判等跳过
import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import Loader from '@cordisjs/plugin-loader'

const path = process.argv[2] ?? './app.yml'
if (path.startsWith('./app')) {
  await copyFile('./app.template.yml', './app.yml')
}

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({ id: 'app', name: '@cordisjs/plugin-include', config: { path } })
await new Promise(r => setTimeout(r, 500))

console.log(`--- ${path}: append a comment, then refresh() ---`)
const tree = ctx.loader.store['app'].subtree
const src = await readFile(path, 'utf8')
await writeFile(path, '# comment\n' + src)
await tree.refresh()
await new Promise(r => setTimeout(r, 500))
console.log(`--- ${path}: done ---`)
process.exit(0)
