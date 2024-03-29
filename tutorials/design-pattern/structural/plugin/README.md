# 插件

为什么？

插件可以保证框架核心的足够精简、稳定、高效，还可以促进业务逻辑的复用，生态圈的形成。

实现形式

- 约定：按某个约定的方式来编写和加载插件，例如：umi 约定式的路由组件。
- 事件：在一些阶段放出钩子，允许用户代码拓展整体框架的生命周期。
- 插槽：一般用在 UI 元素的扩展

加载方式

- 约定式：模块名、文件名
- 配置式：package.json、xxxrc.json
- 代码式：config.js

生命周期

- 事件流
- 洋葱模型

常见问题

- 插件的加载顺序
- 插件之间的依赖和通信

设计模式

- 观察者模式：事件机制就是一种观察模式的实现，通过在特定的事件钩子上注册回调函数来干预核心处理机制

- [插件式可扩展架构设计心得](https://zhuanlan.zhihu.com/p/372381276)
- [【第3165期】谈谈如何设计一个插件（Plugin）体系](https://mp.weixin.qq.com/s/cVh8NabfN5b5nJqP8I7-aQ)

## 案例分析

- babel
- webpack
- express
- koa
- egg

### webpack

- [Webpack tapable 使用研究](https://juejin.im/post/6844903895584473096#heading-18)
- [脑壳疼的Webpack-tapable](https://juejin.im/post/6844903825774493710#heading-30)
- [Webpack 核心库 Tapable 的使用与原理解析](https://zhuanlan.zhihu.com/p/100974318)
- [关于 tapable 你需要知道这些](https://zhuanlan.zhihu.com/p/79221553)
- [tapable在webpack主流程中的应用](https://hellogithub2014.github.io/2018/12/26/tapable-usage-in-webpack-main-procedure/)
- [What the Hook? Learn the basics of Tapable](https://codeburst.io/what-the-hook-learn-the-basics-of-tapable-d95eb0401e2c)

### Babel

解析(babylon) => 转换(babel-traverse) => 生成(babel-generator)

- [Babel 插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md)
- [Babel 插件原理的理解与深入](https://github.com/frontend9/fe9-library/issues/154)
- [Babel 的工作原理以及怎么写一个 Babel 插件](https://cloud.tencent.com/developer/article/1520124)
- [[第9期] 深入浅出 Babel 上篇：架构和原理 + 实战](https://cloud.tencent.com/developer/article/1593485)
- [通过开发 Babel 插件来理解什么是抽象语法树（AST）](https://vince.xin/2019/06/22/%E9%80%9A%E8%BF%87%E5%BC%80%E5%8F%91-Babel-%E6%8F%92%E4%BB%B6%E6%9D%A5%E7%90%86%E8%A7%A3%E4%BB%80%E4%B9%88%E6%98%AF%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91%EF%BC%88AST%EF%BC%89/#%E5%BC%80%E5%8F%91-Babel-%E6%8F%92%E4%BB%B6-Demo)
- [深入浅出 Babel 上篇：架构和原理 + 实战](https://bobi.ink/2019/10/01/babel/)
- [面试官: 你了解过Babel吗？写过Babel插件吗? 答: 没有。卒](https://cnodejs.org/topic/5a9317d38d6e16e56bb808d1)
- [babel原理及插件开发](https://juejin.im/post/6844903603983892487)

### Figma

- [How to build a plugin system on the web and also sleep well at night](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)

## 参考文献

- [精读《插件化思维》](https://zhuanlan.zhihu.com/p/35997606?group_id=971688117610254336)
- [插件开发](https://eggjs.org/zh-cn/advanced/plugin.html)
- [前端插件机制的探索](https://www.keisei.top/plugin-mechanism/)

---

- [如何设计开发一个 Web 插件系统](https://juejin.cn/post/6965049497403523108)
- [小话设计模式（番外一）插件模式](https://blog.csdn.net/ecidevilin/article/details/52743228)
- [插件开发概述 - IBM](https://www.ibm.com/docs/zh/cloud-pak-system-software/2.2.5?topic=guide-plug-in-development-overview)
- [前端领域的插件式设计](https://mp.weixin.qq.com/s?__biz=Mzk0MDMwMzQyOA==&mid=2247496473&idx=1&sn=ff61a2e7468a5cb98d1b249a55506cc6&scene=21#wechat_redirect)
