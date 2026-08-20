// 实验：分组嵌套与 id 寻址——outer 组嵌 inner 组，inner 内是 leaf 插件。
// 验证：组层级不进 id 路径（':' 只跨清单文件树边界），外层停用级联穿透嵌套。
// 运行：node nested-demo.mjs（先从 nested.template.yml 恢复初始清单）
import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'
import { copyFile } from 'node:fs/promises'
import Loader from '@cordisjs/plugin-loader'

await copyFile('./nested.template.yml', './nested.yml')

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({ id: 'app', name: '@cordisjs/plugin-include', config: { path: './nested.yml' } })
await new Promise(r => setTimeout(r, 500))

console.log('resolve app:leaf ->', ctx.loader.resolve('app:leaf').options.name)
console.log('resolve app:inner (group entry) ->', ctx.loader.resolve('app:inner').options.label)
console.log('--- disable outer group: cascade through nested groups ---')
await ctx.loader.update('app:outer', { disabled: true })
await new Promise(r => setTimeout(r, 300))
process.exit(0)
