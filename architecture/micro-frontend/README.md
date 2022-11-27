# 微前端

- https://micro-frontends.org/

## 背景

- ”巨石“应用构建部署速度越来越慢，页面加载速度也越来越慢；
- 旧项目渐进式技术重构（可能是升级或更换技术框架）；
- 业务重组合成一个大应用；

参考案例

- 每每日优鲜大前端团队

    > - 团队目前有十多个典型的 toB 业务（菜单+内容布局），这些业务都是服务于一个大平台的，因为历史原因，每个业务都是独立的，都有一个 HTML 入口，所以当用户在这个大平台上使用这十多个业务的时候，每当切换系统时，页面都会刷新，体验很差；在开发层面，这十多个业务又有太多共同之处，每次修改成本都很高。
    >
    > - 从十多个项目中，每个项目抽取若干功能组成一个新项目，基于现有架构的话，每当点击来自不同系统的功能页面就要刷新一次，这是不可接受的。为了新需求重复开发一遍这些业务功能又不现实，所以从技术角度来看，架构改造不可避免。

- hel-micro

    > 这种包含 N 个服务构成的一个后台项目，从开发侧看，只能在既有的技术栈上不停的叠加新功能，当新的技术福利诞生时想作替换将是一场噩梦，从运维测看，因整个项目打包在一起构成了一个产物，而不得不面对任何一点修改都必须全部一起发布的繁琐。

参考文献

- [每日优鲜供应链前端团队微前端改造](https://juejin.cn/post/6844903943873675271)]

## 原理

核心思想

- 技术无关：每个团队都应该能够选择和升级他们的堆栈，而无需与其他团队协调。
- 独立开发：。。。
- 独立部署：。。。
- 独立运行：。。。
- 代码复用：。。。
- 代码隔离：不要共享运行时，即使所有团队都使用相同的框架。构建自包含的独立应用程序。不要依赖共享状态或全局变量。
- 消息通信

### 代码复用

- bundle external
- module federation
- micro-module runtime

### 代码隔离

| 方案/特性 | JS 隔离 | CSS 隔离 | 优点 | 缺点 |
| ---  | --- | --- | --- | --- |
| iframe | ✓ | ✓ | 天然的代码隔离，兼容性好 | URL 不同步、UI 不同步、数据共享和加载慢 |
| shadow realm | ✓ | ✗ | 未来的标准方案 | 只针对 JS，兼容性不好 |
| proxy window | ✓ | ✗ | 兼容性好 | 在某些场景下执行性能下降严重 |
| web-component | ✗ | ✓ | 标准方案 | 只针对 CSS，JS 全局仍然无法隔离 |
| CSS IN JS | ✗ | ✓ | 开发体验好 | 只针对 CSS，且可能存在性能问题 |
| 约定前缀 | ✓ | ✓ | 作为补充方案，就尚无法隔离的命名约定达成一致。命名空间 CSS、事件、本地存储和 Cookie，以避免冲突并明确所有权。 | 需要依靠开发者自行做好代码隔离 |

#### JS 沙箱隔离方案

- iframe

- web worker

- shadow realm

- sandbox：
    实现方式

    - with() + new Function(code) + Diff

    - with() + new Function(code) + Proxy Diff

    - with() + new Function(code) + Proxy

        缺点：

        - proxy window 一般采用 with ( fakewindow ) 这种方式来指定子应用的执行上下文，但会导致的性能下降。
        - 对 window 拦截的程度是有限的，甚至**可以简单理解为「浅拷贝」而非「深拷贝」**，通过全局通用 API 很容易做到逃逸而实现污染，比如直接改掉 `Array.prototype.push` 的行为（可以使用下一个方案优化）；

    - with() + new Function(code) + Proxy + iframe contex

        缺点：

        - 跨域问题
        - 图啥？？?

    局限性

    - 
    - 变量声明提升失效
    - 无法限制沙箱内创建的 iframe

    其他问题

    - new Function VS with：`new Function` 执行 code 作用等同于 eval，但 eval 能访问到当前局部作用域变量，new Function 返回函数不管哪里执行，都只能访问全局作用域

- Wasm VM：重新编译一个 Wasm 的 JS 解释器放在浏览器中，把子应用直接放进这个 VM 中执行；
    问题：隔离太严格了，通信非常麻烦，通信开销非常大；

参考文献

- [面向微前端，谈谈 JavaScript 隔离沙箱机制的古往今来 - Joe’s Blog (hijiangtao.github.io)](https://hijiangtao.github.io/2022/06/11/JavaScript-Sandbox-Mechanism-and-Its-History/)
- [浏览器沙箱模式探究 | 华仔的博客 (linghuam.github.io)](https://linghuam.github.io/2020/01/16/浏览器沙箱模式探究/)
- [如何“取巧”实现一个微前端沙箱？-阿里云开发者社区 (aliyun.com)](https://developer.aliyun.com/article/761449)
- [谈谈微前端领域的js沙箱实现机制 (qq.com)](https://mp.weixin.qq.com/s/IJMgMO1IeYw2Io8MN7WZWQ)
- [前端 - 浅探 Web Worker 与 JavaScript 沙箱_个人文章 - SegmentFault 思否](https://segmentfault.com/a/1190000039795656)


#### CSS 样式隔离

- 命名

  - BEM
  - CSS Module
  - CSS IN JS
  - Limit Container：子应用样式写在以子应用名作为命名空间的类里
  - Namespace：使用 postcss 给样式类名增加前缀
    存在问题：
    - 部分第三方库不支持定制样式类名前缀
  - 

  存在问题

  - 解决不同应用依赖了同一个 UI 库不同版本的情况；
  - 历史项目里面也有很多硬编码的 className 很难彻底改造；

- Shadow DOM
  存在问题

  - 兼容性；
  - 浏览器 Shadow DOM 有一堆 BUG；
  - react-dom 低版本对 Shadow DOM 事件不支持外；
  - 子应用那些通过 JS 往 document.body 上插的元素，如 Tooltip / Popover / Modal 怎么办？

- Dynamic Stylesheet
  存在问题：局限性一是对于站点框架本身或其部件（header/menu/footer）与当前运行的微应用间仍存在样式冲突的可能性，二是没有办法支持多个微应用同时运行显示的情况。

- Iframe

  

#### iframe

- [tab、iframe 进程隔离](https://github.com/ascoders/weekly/blob/master/%E5%89%8D%E6%B2%BF%E6%8A%80%E6%9C%AF/219.%E7%B2%BE%E8%AF%BB%E3%80%8A%E6%B7%B1%E5%85%A5%E4%BA%86%E8%A7%A3%E7%8E%B0%E4%BB%A3%E6%B5%8F%E8%A7%88%E5%99%A8%E4%B8%80%E3%80%8B.md#tabiframe-%E8%BF%9B%E7%A8%8B%E9%9A%94%E7%A6%BB)
- [Why Not Iframe](https://www.yuque.com/kuitos/gky7yw/gesexv)

### 消息通信

- 自定义事件通信：EventEmitter、EventTarget；
- 全局状态：参考 react 和 vue 的状态管理框架；
- URL 传参通信；


## 方案

- 容器化

    - 定义：以 single-spa 为代表的这一类方案统称为微容器，对应的模块粒度是整个应用，做出的产品可以理解为一种以宏观态的方式来组合多个应用交付给用户使用。
    - 场景：可用于技术无关的微前端方案

- 微模块：

    - 定义：为微观态的组合方式，它的粒度更小，小到可以是一个函数，一个基础的组件，对于开发者来说，引入微模块和引入一个普通的js包没有任何区别，他们在使用上也并无任何区别。
    - 场景：适用于单一技术栈的微前端方案，且微模块解决的核心问题是大规模独立构建的应用间如何快速动态共享公共模块这个棘手问题，可以作为容器化微前端的辅助技术。

最佳实践：

- 容器化：要多技术栈混合开发、需要多版本技术栈同时迭代；
- 微模块：单一技术栈，可以迅速的将你逐渐庞大的应用拆为一个个可独立部署的组件并再次组合起来；
- 容器化 + 微模块：两者解决的问题不一样，可以组合起来使用。可以先使用微容器再接入微模块做跨应用模块动态共享，或先使用微模块再套上微容器做运行时隔离。

参考文献

- [从场景倒推我们要什么样的微前端体系](https://juejin.cn/post/6981638032768106526)
- [关于微前端，你理解到究极奥义了么？](https://juejin.cn/post/7162539136577404964)
- [从场景倒推我们要什么样的微前端体系 - 掘金 (juejin.cn)](https://juejin.cn/post/6981638032768106526#heading-8)

### 容器化

| 框架 / 特性 | 技术无关 | 代码复用 | 代码隔离 | 消息通信 | 预加载 | 多应用激活 | 子应用保活 | 子应用嵌套 | 简介 | 评价 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [single-spa](https://github.com/single-spa/single-spa) | ✓ | module federation | ✗| ✗ | ✗ | ✗ | ✗ | ✗ | The router for easy microfrontends. | 最早的微前端框架，兼容多种前端技术栈； |
| [qiankun](https://github.com/umijs/qiankun) | ✓ | module federation | 自制沙箱 | ✓ | 预加载静态资源 | ✗ | ✗ | ✗ | Blazing fast, simple and completed solution for micro frontends. | 阿里系开源的微前端框架，旨在帮助大家能更简单、无痛的构建一个生产可用微前端架构系统。 |
| [garfish](https://github.com/modern-js-dev/garfish) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | 由字节跳动开源的一套微前端解决方案，主要用于解决现代 web 应用在前端生态繁荣和 web 应用日益复杂化两大背景下带来的 `跨团队协作、技术体系多样化、应用日益复杂化`等问题，Garfish 已经经过大量的线上应用的打磨和测试，功能稳定可靠。 |
| [micro-app](https://github.com/micro-zoe/micro-app) | ✓ | module-federation | webcomponent + 自制沙箱 | ✓ | 预加载静态资源 | ✓ | ✓ | ✗| A lightweight, efficient and powerful micro front-end framework.  | 京东出的一款基于 `Web Component` 原生组件进行渲染的微前端框架，不同于目前流行的开源框架，它从组件化的思维实现微前端，旨在降低上手难度、提升工作效率。 |
| [wujie](https://github.com/Tencent/wujie) | ✓ | bundle external | iframe | ✓ | 预加载静态资源和子应用 | ✓ | ✓ | ✓ | 极致的微前端框架 |  |
| [piral](https://github.com/smapiot/piral) | ✓ | ✓ | ✓ | ✓ | ? | ? | ? | ? | Framework for next generation web apps using micro frontends. | 相较于国外其它微前端框架，Piral 有更好的社区，文档，团队，如果你还在思考使用哪种微前端框架，Piral 不失为一个不错的选择； |
| [luigi](https://github.com/SAP/luigi) | ✓ | ✓ | ? | ? | ? | ? | ? | ? | Micro frontend framework | 国外 SAP 团队开源的一个用于微前端 JavaScript 框架，提供了配置选项、API 函数和开箱即用的功能，使迁移到微前端架构更容易。Luigi 为您的所有微前端提供一致的用户导航，确保更好的用户体验。 |
| [alibabacloud-alfa](https://github.com/aliyun/alibabacloud-alfa) | ✓ | ？ | ✓ | ? | ? | ✗ | ✗ | ✗ | 阿里云微前端解决方案 |  |

更多方案：

- [ice-lab/icestark: Micro Frontends solution for large application（面向大型应用的微前端解决方案），站点国内镜像：https://icestark.gitee.io (github.com)](https://github.com/ice-lab/icestark)

存在问题：

- 加载慢：基本上所有的微前端框架都需要先加载父框架，再加载子应用，都要经历如下图的流程。整个流程是串行的，相同流程需要走两遍，也就比普通的非微前端框架要慢1倍左右，直接影响了用户体验。
- 切换慢：微前端框架中不同子应用切换，需要销毁当前子应用，然后加载其他子应用。子应用又需要进行“下载html --> 下载javascript文件 --> 运行javascript代码 --> 请求服务端数据 --> 页面展示"整个流程，导致微前端框架切换应用卡顿不流畅。
- 隔离差：容易出现样式冲突，不同子应用容易影响。

参考文献

- [基于 iframe 的微前端框架 —— 擎天](https://juejin.cn/post/7143038795816910878)
- [万字长文-落地微前端 qiankun 理论与实践指北](https://juejin.cn/post/7069566144750813197#heading-47)

### 微模块

- [Module Federation](https://webpack.js.org/concepts/module-federation/)
- [elux](https://github.com/hiisea/elux) - 基于“微模块”和“模型驱动”的跨平台、跨框架『同构方案』，支持React/Vue/Web(浏览器)/Micro(微前端)/SSR(服务器渲染)/MP(小程序)/APP(手机应用)
- [hel](https://github.com/tnfe/hel) - 工具链无关的运行时模块联邦 SDK.
- [bit ](https://github.com/teambit/bit) - A tool for composable software development.
- [emp](https://github.com/efoxTeam/emp) - EMP Micro FE Base on webpack 5 & module federation
- [oc](https://github.com/opencomponents/oc) - OpenComponents, serverless in the front-end world for painless micro-frontends delivery	

	OC 旨在成为一个 一站式微前端框架，从而使其成为一个丰富而复杂的系统，其中包括从组件处理到注册表、再到模板、甚至包括 CLI 工具。

## 参考文献

- [你可能并不需要微前端](https://www.yuque.com/kuitos/gky7yw/fy3qri)
- [微前端的核心价值](https://www.yuque.com/kuitos/gky7yw/rhduwc)
- [探索微前端的场景极限](https://www.yuque.com/kuitos/gky7yw/uyp6wi)
- [目标是最完善的微前端解决方案 - qiankun 2.0](https://www.yuque.com/kuitos/gky7yw/viueoh)
- [每日优鲜供应链前端团队微前端改造](https://juejin.cn/post/6844903943873675271)
- [微前端入门](https://juejin.cn/post/6844903953734336525#heading-13)
- [探索微前端的场景极限](https://www.yuque.com/kuitos/gky7yw/uyp6wi)
- [美业微前端的落地](https://segmentfault.com/a/1190000040106401?_ea=136216131)
- [微前端的几种实现方案](http://article.docway.net/details?id=603df47d4da5fa6fd85cee11)
- [如何在应用架构中设计微前端方案 - icestark](https://fed.taobao.org/blog/taofed/do71ct/xgmaz3/)
- [微前端连载 1 / 7：如何落地微前端一体化运营工作台](https://juejin.cn/post/6844904194818703374)
- [微前端连载 2/7: 如何分三步实施微前端](https://juejin.cn/post/6844904201441525774)
- [微前端连载 3/7：淘宝大型应用架构中的微前端方案](https://juejin.cn/post/6844904202389438478)
- [微前端连载 4/7：在字节跳动设计与实践微前端沙盒](https://juejin.cn/post/6844904205367377928)
- [微前端连载 5/7：微前端主子应用路由调度](https://juejin.cn/post/6847902217945481224)
- [微前端连载 6/7：微前端框架 - qiankun 大法好](https://juejin.cn/post/6846687602439897101)
- [微前端“容器”——microcosmos实现](https://segmentfault.com/a/1190000023850793)
- [How We Build Micro Frontends With Lattice](https://netflixtechblog.com/how-we-build-micro-frontends-with-lattice-22b8635f77ea)
- [The Future of Micro-Frontends](https://betterprogramming.pub/the-future-of-micro-frontends-2f527f97d506)
- [从"微前端"到“微模块”](https://juejin.cn/post/7106791733509226533)
- [关于微前端，你理解到究极奥义了么？](https://v2ex.com/t/895285#reply44)
