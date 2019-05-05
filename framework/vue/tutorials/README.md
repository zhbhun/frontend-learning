教程
========

## 版本区分

- UMD VS CommonJS VS ES Module

    - UMD：UMD 版本可以通过 `<script>` 标签直接用在浏览器中。
    - CommonJS：CommonJS 版本用来配合老的打包工具比如 Browserify 或 webpack 1。
    - ES Module：ES module 版本用来配合现代打包工具比如 webpack 2 或 Rollup。

- 完整版 VS 运行时版

    完整版同时包含编译器和运行时的版本，编译器用来将模板字符串编译成为 JavaScript 渲染函数的代码，运行时用来创建 Vue 实例、渲染并处理虚拟 DOM 等的代码。如果你需要在客户端编译模板 (比如传入一个字符串给 template 选项，或挂载到一个元素上并以其 DOM 内部的 HTML 作为模板)，就将需要加上编译器，即完整版。当使用 vue-loader 或 vueify 的时候，*.vue 文件内部的模板会在构建时预编译成 JavaScript。你在最终打好的包里实际上是不需要编译器的，所以只用运行时版本即可（运行时版本相比完整版体积要小大约 30%）。

- 开发版本 VS 生产版本

    对于 UMD 版本来说，开发环境/生产环境模式是硬编码好的：开发环境下用未压缩的代码，生产环境下使用压缩后的代码。CommonJS 和 ES Module 版本是用于打包工具的，因此我们不提供压缩后的版本。你需要自行将最终的包进行压缩。CommonJS 和 ES Module 版本同时保留原始的 process.env.NODE_ENV 检测，以决定它们应该运行在什么模式下。

## 安装使用

- 浏览器
- 构建工具
- 服务端渲染

## 生命周期

![xxx](https://cn.vuejs.org/images/lifecycle.png)

## 模板语法

- 插值：`{{}}`
- 指令：参数，修饰符，缩写

    - 条件
    - 循环
    - 事件
    - 表单
    - 样式：`v-bind:class`、`v-bind:style`

## 组件化
