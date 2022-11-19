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
- 代码复用：。。。
- 代码隔离：不要共享运行时，即使所有团队都使用相同的框架。构建自包含的独立应用程序。不要依赖共享状态或全局变量。
- 约定前缀：就尚无法隔离的命名约定达成一致。命名空间 CSS、事件、本地存储和 Cookie，以避免冲突并明确所有权。

参考文献

- [关于微前端，你理解到究极奥义了么？](https://juejin.cn/post/7162539136577404964)

### 代码复用

- 模块联邦

### 代码隔离

#### JS 隔离

- shadowrealm(未来的隔离方案)
- proxy window
- iframe 等

参考文献

- [tab、iframe 进程隔离](https://github.com/ascoders/weekly/blob/master/%E5%89%8D%E6%B2%BF%E6%8A%80%E6%9C%AF/219.%E7%B2%BE%E8%AF%BB%E3%80%8A%E6%B7%B1%E5%85%A5%E4%BA%86%E8%A7%A3%E7%8E%B0%E4%BB%A3%E6%B5%8F%E8%A7%88%E5%99%A8%E4%B8%80%E3%80%8B.md#tabiframe-%E8%BF%9B%E7%A8%8B%E9%9A%94%E7%A6%BB)
- [Why Not Iframe](https://www.yuque.com/kuitos/gky7yw/gesexv)

#### CSS 隔离

- 约定前缀
- CSS IN JS
- web-component

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

### 容器化

- [single-spa](https://github.com/single-spa/single-spa) - The router for easy microfrontends.
- [qiankun](https://github.com/umijs/qiankun) - Blazing fast, simple and completed solution for micro frontends.
- [micro-app](https://github.com/micro-zoe/micro-app) - A lightweight, efficient and powerful micro front-end framework. 
- [wujie](https://github.com/Tencent/wujie) - 极致的微前端框架
- [alibabacloud-alfa](https://github.com/aliyun/alibabacloud-alfa) - 阿里云微前端解决方案

### 微模块

- [Module Federation](https://webpack.js.org/concepts/module-federation/)
- [elux](https://github.com/hiisea/elux) - 基于“微模块”和“模型驱动”的跨平台、跨框架『同构方案』，支持React/Vue/Web(浏览器)/Micro(微前端)/SSR(服务器渲染)/MP(小程序)/APP(手机应用)
- [hel](https://github.com/tnfe/hel) - 工具链无关的运行时模块联邦 SDK.

## Interview

- 微前端的应用场景（什么时候用？为什么要用？）
- 代码隔离：JS、CSS
- 应用通信：事件总线（分发和订阅模式）、原生事件
- 有 100 个内部的前端项目依赖了 lodash-1.0.0，突然该库暴露了一个漏洞，你需要 100 个前端项目全部重新构建升级到 1.0.1 才代表安全解决此漏洞问题？

    在没有容器化方案的情况下，考核微模块的相关知识和技术方案。

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
