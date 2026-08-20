// 实验：include 的 patches——初始加载时插入插件、按 id 覆盖字段；验证补丁不落盘，
// 以及清单热更新（refresh）后补丁不重放。
// 运行：node patches.mjs（先从 app.template.yml 恢复初始清单）
import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import Loader from '@cordisjs/plugin-loader'

await copyFile('./app.template.yml', './app.yml')

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({
  id: 'app',
  name: '@cordisjs/plugin-include',
  config: {
    path: './app.yml',
    patches: [
      // 顶层插入一个插件
      { insert: [{ id: 'd1', name: './plugin-c.js' }] },
      // 按 id 覆盖：停用 Dev 分组（plugin-b 随之不加载）
      { id: 'g1', disabled: true },
    ],
  },
})

const before = await readFile('./app.yml', 'utf8')
await new Promise(r => setTimeout(r, 500))
console.log('--- patches applied at init ---')
console.log('--- app.yml unchanged on disk:', before === await readFile('./app.yml', 'utf8'), '---')

const tree = ctx.loader.store['app'].subtree
// 仅改一行注释触发内容判等为「已变化」，再走 refresh()
await writeFile('./app.yml', '# comment\n' + before)
await tree.refresh()
await new Promise(r => setTimeout(r, 500))
console.log('--- after refresh: patches are NOT reapplied ---')
process.exit(0)
