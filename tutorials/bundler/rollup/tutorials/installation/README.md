# 安装

## 安装方式

- 全局安装：`npm install --global rollup`
- 本地安装

## 使用方式

- 命令行：参见 [Command Line Interface](https://rollupjs.org/guide/en/#command-line-reference)
- API：参见 [JavaScript API](https://rollupjs.org/guide/en/#javascript-api)

## 使用示例

- 浏览器：`rollup main.js --file bundle.js --format iife`
- Node.js：`rollup main.js --file bundle.js --format cjs`
- 浏览器和 Node.js：`rollup main.js --file bundle.js --format umd --name "myBundle"`

ps：参见示例 ./dist/demo

## 使用场景

- app：[rollup-starter-app](https://github.com/rollup/rollup-starter-app)
- lib：[rollup-starter-lib](https://github.com/rollup/rollup-starter-lib)
