// 实验 A：Loader + Include 驱动 app.yml——分组加载、!!js 插值、运行时停用分组与清单回写
// 运行：node bootstrap.mjs（实验会写回 app.yml，脚本先从 app.template.yml 恢复初始版）
import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'
import { copyFile, readFile } from 'node:fs/promises'
import Loader from '@cordisjs/plugin-loader'

await copyFile('./app.template.yml', './app.yml')

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'

await ctx.plugin(Loader)
await ctx.loader.create({
  id: 'app',
  name: '@cordisjs/plugin-include',
  config: { path: './app.yml' },
})

setTimeout(async () => {
  console.log('--- disable group app:g1 via loader API ---')
  await ctx.loader.update('app:g1', { disabled: true })
  await new Promise(r => setTimeout(r, 100)) // write() 经 setTimeout(0) 异步落盘
  console.log('--- app.yml after write ---')
  console.log(await readFile('./app.yml', 'utf8'))
  process.exit(0)
}, 1200)
