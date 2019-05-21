
# [安装](https://cn.vuejs.org/v2/guide/installation.html)

## 下载来源

- CDN：

    - [jsDelivr](https://cdn.jsdelivr.net/npm/vue/)
    - [UNPKG](https://unpkg.com/vue@2.6.10/)
    - [cdnjs](https://cdnjs.cloudflare.com/ajax/libs/vue/2.6.10/vue.js)

- Package

    - [NPM](https://www.npmjs.com/package/vue)
    - [Yarn](https://yarnpkg.com/zh-Hant/package/vue)

## [版本区分](https://cn.vuejs.org/v2/guide/installation.html#%E5%AF%B9%E4%B8%8D%E5%90%8C%E6%9E%84%E5%BB%BA%E7%89%88%E6%9C%AC%E7%9A%84%E8%A7%A3%E9%87%8A)

- UMD VS CommonJS VS ES Module VS ES Module Browser

    - UMD：UMD 版本可以通过 `<script>` 标签直接用在浏览器中。
    - CommonJS：CommonJS 版本用来配合老的打包工具比如 Browserify 或 webpack 1。
    - ES Module：ES module 版本用来配合现代打包工具比如 webpack 2 或 Rollup。

- 完整版 VS 运行时版

    完整版同时包含编译器和运行时的版本，编译器用来将模板字符串编译成为 JavaScript 渲染函数的代码，运行时用来创建 Vue 实例、渲染并处理虚拟 DOM 等的代码。如果你需要在客户端编译模板 (比如传入一个字符串给 template 选项，或挂载到一个元素上并以其 DOM 内部的 HTML 作为模板)，就将需要加上编译器，即完整版。当使用 vue-loader 或 vueify 的时候，*.vue 文件内部的模板会在构建时预编译成 JavaScript。你在最终打好的包里实际上是不需要编译器的，所以只用运行时版本即可（运行时版本相比完整版体积要小大约 30%）。

- 开发版本 VS 生产版本

    对于 UMD 版本来说，开发环境/生产环境模式是硬编码好的：开发环境下用未压缩的代码，生产环境下使用压缩后的代码。CommonJS 和 ES Module 版本是用于打包工具的，因此我们不提供压缩后的版本。你需要自行将最终的包进行压缩。CommonJS 和 ES Module 版本同时保留原始的 process.env.NODE_ENV 检测，以决定它们应该运行在什么模式下。

## 使用方式

### 直接用 `<script>` 引入

- 普通脚本

    `<script src="https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.js"></script>`

- 模块化脚本

    ```html
    <script type="module">
        import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.esm.browser.js'
    </script>
    ```

### 在线调试

- [CodeSandbox](https://codesandbox.io/)
- [CodePen](https://codepen.io)
- [JSFiddle](https://jsfiddle.net/chrisvfritz/50wL7mdz/)

### 命令行工具

- [vue-cli](https://github.com/vuejs/vue-cli)

## 示例

1. [插值](./examples/interpolation.html)
2. [条件](./examples/conditionals.html)
3. [循环](./examples/loops.html)
4. [用户输入](./examples/input.html)
5. [组件化](./examples/components.html)

