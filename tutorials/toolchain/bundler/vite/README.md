# [vit](https://vitejs.dev/)

- https://github.com/vitejs/awesome-vite
- [Vite Conf](https://viteconf.org/schedule)

## 插件

- [Vite Rollup Plugins](https://vite-rollup-plugins.patak.dev/)
- [unplugin-vue-components](https://github.com/antfu/unplugin-vue-components) - On-demand components auto importing for Vue

  - https://juejin.cn/post/7012446423367024676

- [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) - Visuallize your bundle

### SSR/SSG

- [vite-ssg](https://github.com/antfu/vite-ssg) - Static site generation for Vue 3 on Vite

## 脚手架

- [vitesse](https://github.com/antfu/vitesse)

## 应用

### CSS

- [如何使用 Vite.js 构建 CSS 库](https://www.freecodecamp.org/chinese/news/build-a-css-library-with-vitejs/)

## 问题

### `require is not defined`

- [require is not defined when importing a node_module that imports a CSS file](https://github.com/vitejs/vite/issues/3409#issuecomment-1138202247)

### `JS hash fails to change when asset URL changes`

- [JS hash fails to change when asset URL changes](https://github.com/rollup/rollup/issues/3415)
- [File hash is not updated when changing code in renderChunk](https://github.com/rollup/rollup/issues/2739)
- [[v3.0] New hashing algorithm that "fixes (nearly) everything"](https://github.com/rollup/rollup/pull/4543)

解决：Use Rollup's augmentChunkHash hook to ensure hash takes account of chunk.viteMetadata.importedCss

- [fix(build): invalidate chunk hash when css changed ](https://github.com/vitejs/vite/pull/11475)

### 第三方库 less 引入另外一个第三方库的样式文件时找不到的问题

参见 [](./examples/css-import-in-vendor/README.md)

### 第三方库样式重复引入问题

1. 类似 antd 这样的库提供了两种模块：commonjs 和 esmodule，两种模块都有样式文件，很可能是混用导致的。

### 第三方库混用了 esmodule 和 commonjs 时，vite 转译失效

- [build.commonjsOptions](https://cn.vitejs.dev/config/build-options.html#build-commonjsoptions)
- [transformMixedEsModules](https://github.com/rollup/plugins/tree/master/packages/commonjs)
