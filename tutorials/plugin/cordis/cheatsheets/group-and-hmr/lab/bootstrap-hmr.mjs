// 实验 B：完整 HMR 链路——Loader + include(app-hmr.yml) + hmr(root: '.')。
// 运行：node --expose-internals bootstrap-hmr.mjs（实验改动的清单先从模板恢复）。
// 启动后分别尝试：改 plugin-b.js 的输出文案；给 app-hmr.yml 的 a0 加 disabled: true；
// 往 plugin-b.js 写入语法错误再改回——三类变更的行为见课程正文。
import { Context } from 'cordis'
import { pathToFileURL } from 'node:url'
import { copyFile } from 'node:fs/promises'
import Loader from '@cordisjs/plugin-loader'
import consoleLogger from '@cordisjs/plugin-logger-console'

await copyFile('./app-hmr.template.yml', './app-hmr.yml')

const ctx = new Context()
ctx.baseUrl = pathToFileURL(process.cwd()).href + '/'
await ctx.plugin(consoleLogger)

await ctx.plugin(Loader)
await ctx.loader.create({
  id: 'app',
  name: '@cordisjs/plugin-include',
  config: { path: './app-hmr.yml' },
})
