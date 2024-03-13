# 打包工具

## 构建工具

- webpack
- rollup
- esbuild
- rspack

| 特性\工具 | webpack | rollup | esbuild | rspack | rolldown |
| --- | --- | --- | --- | --- | --- |
| 模块化:输入 | 原生仅支持 JS 和 JSON，通过插件可以支持任意类型 | 同 webpack | 同 webpack，但生态有限 | 原生支持，但生态有限 | / |
| 模块化:输出 | IIFE、UMD、AMD、CommonJS 和 ES Modules | 同 webpack | 同 webpack | 同 webpack | / |
| 模块化:懒加载 | 支持 | 支持 | 支持 | 支持 | / |
| 模块化:别名 | 支持 | 支持 | 支持 | 支持 | / |
| 打包:压缩优化 | 支持 | 支持 | 支持 | 支持 | / |
| 打包:代码分割 | import、多 entry、SplitChunksPlugin(强大) | import、多 input  | import、多 input | 同 webpack | / |
| 调试:自动刷新 | 支持 | 靠社区插件 rollup-plugin-serve 和 rollup-plugin-livereload 实现 | 支持 | 支持 | / |
| 调试:热重载 | 支持 | 支持 | 支持 | 支持 | / |
| 调试:历史记录回退 | 支持 | 支持 | 支持 | / |
| 调试:接口代理 | 支持 | 同上 | 不支持 | 不支持 | / |
| 调试:HTTPS | 支持 | 同上 | 不支持 | 不支持 | / |
| 调试:自定义中间件 | 支持 | 同上 | 不支持 | 不支持 | / |

## 构建框架

- parcel
- vite
- rsbuild

## 应用框架

- umi.js
- next.js
- rspress
- vitepress
- ...

### 底层


- vite
- esbuild
- [rspack](https://github.com/web-infra-dev/rspack)
- [farm](https://github.com/farm-fe/farm)
- swc
- turborepo
- Nx
- Rome
- https://webpack.js.org/
- http://browserify.org/
- https://rollupjs.org/guide/en
- https://parceljs.org/

    - [packer-cli](https://github.com/yohangz/packer-cli) - Full-fledged CLI tool to generate and package node modules compliant with Browser and NodeJS. Packer CLI support all modern style, unit test and script transpiler tools.

- [rollup](https://github.com/rollup/rollup) - Next-generation ES module bundler
- https://github.com/lukeed/pwa
- [moon](https://github.com/moonrepo/moon) - A build system for the JavaScript ecosystem, written in Rust.

## 分析工具

- [Bundlephobia]( https://bundlephobia.com/ ) -  Bundlephobia helps you find the performance impact of adding a npm package to your front-end bundle. 

## 参考文献

- [精读《新一代前端构建工具对比》](https://segmentfault.com/a/1190000040010523?_ea=131700627)
- [Is It Time To Say Goodbye To Webpack?](https://javascript.plainenglish.io/time-to-say-goodbye-to-webpack-5bf06ff48823)


--- 

- [rome](https://github.com/rome/tools) - Unified developer tools for JavaScript, TypeScript, and the web
- [Rspack](https://mp.weixin.qq.com/s/R-tjPrj2N2DKMO8_cPsp9Q) - Rspack 是由 ByteDance Web Infra 团队孵化的基于 Rust 语言开发的 Web 构建工具，拥有高性能、兼容 Webpack 生态、定制性强等多种优点，解决了我们在业务场景中遇到的非常多的问题，让很多开发者的体验有了质的提升。
- [farm](https://github.com/farm-fe/farm) - Super fast web build tool written in Rust

    - https://github.com/farm-fe/performance-compare
    - [Farm v0.4：最快！增加与 rspack 和 turbopack 性能对比，支持大量新特性](https://zhuanlan.zhihu.com/p/613209716)

- [minipack](https://github.com/ronami/minipack)

## 打包优化

1. polyfill 优化：entry 》 usage 》 polyfill.io

    - entry：全量降级，即没有使用的 API 仍然会被打进 bundle 中，由于 ECMAScript 标准的不断发展，core-js 在 g-zip 压缩后也有 50kb 左右的体积，显然还是太大了
    - usage：按需降级，babel 会扫描所有需要编译的 JS 代码，根据实际使用到的 API 选择性插入所需垫片。看起来是相比 entry 的更优解，但实际过于理想。

        1. 通常基于编译速度的考虑，node_modules 下的模块不会参与 Babel 编译，仅参与 Webpack 打包，如果此时恰巧某个依赖包里没有声明所需的垫片，那么就可能出现垫片缺失，最终导致线上环境 JS 运行异常。
        2. 并不是所有 JS 代码都会参与编译，例如通过一些平台动态下发的脚本，这些平台动态下发的代码完全不经过编译，如果使用了未经降级的 api 也可能会出现 JS 运行异常。
    
    - polyfill.io：如果使用最新的现代化浏览器访问该服务，那么返回的 JS 内容则是空的，反之它会响应浏览器所需的降级 API，既控制了包体积，也能确保未经编译的 JS 获得降级 API，出于安全考虑，我们需要自部署服务，目前 http://polyfill.io 的 node.js 代码是完全开源的，支持自部署，但是实际落地还需要考虑缓存和异常兜底。

2. @babel/runtime => @babel/plugin-transform-runtime

    默认情况下 babel 为了实现 class 功能会生成一些内联辅助函数，例如下图的 createClass。这会产生一个问题，就是当多个模块都使用 class 语法时则会生成多个相同的辅助函数，辅助函数不能复用。我们可以通过注册 babel 插件@babel/plugin-transform-runtime，将硬编码辅助函数的方式改为从@babel/runtime引入辅助函数，实现不同模块间辅助函数的复用。
    
    但是@babel/plugin-transform-runtime的方案也不是毫无问题，和 api 降级一样，同样面临各种依赖包构建不标准带来的困扰。
    
    最大的问题就是没有办法保证依赖包的产物一定使用了 @babel/plugin-transform-runtime 进行构建，语法降级使用了内联的辅助函数，又或者使用了老版本的 babel-runtime·，导致项目最终的构建产物对辅助函数进行了多次打包。

3. Tree-shaking

    tree-shaking 是减少构建产物体积最有效的方式，以常用 lodash 为例，g-zip 后的体积 24kb，但是项目中使用到的函数并不多，如果能够为它启用 tree-shaking，代码体积能控制在 1kb 以内。如何为依赖代码启用 tree-shaking？

    1. package.json 声明 module 字段，地址指向 ESM 规范的构建产物
    2. package.json 声明sideEffects:false，告诉 Webpack 整个依赖包没有存在副作用，或者指明存在副作用模块的地址。

4. Duplicate dependencies 重复依赖

    当我们的项目中存在 Root→C→D@2.0.0，Root→B→D@3.0.0类似的依赖关系时，node_modules 下嵌套安装了 2 个版本的依赖 D，即D@2.0.0，D@3.0.0。这可能导致在构建的产物中也同样存在两份相同依赖不同版本的代码，除了会影响代码体积，还可能导致代码运行异常。解决方式是升级 B 的依赖D@2.0.0→D@3.0.0，此时重新安装后 node_modules 的嵌套结构会恢复扁平。我们可以使用 find-duplicate-dependencies 和 webpack-bundle-analyzer 这些工具辅助我们排查依赖重复打包的问题。


参考文献

- [你构建的代码为什么这么大](https://zhuanlan.zhihu.com/p/593065108)
