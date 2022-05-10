# 源码分析

- [React技术揭秘](https://react.iamkasong.com/#%E5%AF%BC%E5%AD%A6%E8%A7%86%E9%A2%91)
- [React 源码解析](https://react.jokcy.me/)
- [万字长文+图文并茂+全面解析 React 源码 - render 篇](https://segmentfault.com/a/1190000022105022)


## 架构



---

## Fiber

- [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture)
- [React Fiber 原理介绍](https://segmentfault.com/a/1190000018250127)
- [React Fiber知识点学习笔记](https://segmentfault.com/a/1190000017784309)
- [React Fiber是什么](https://zhuanlan.zhihu.com/p/26027085)
- [React Fiber](https://juejin.cn/post/6844903582622285831)
- [A look inside React Fiber](https://makersden.io/blog/look-inside-fiber)
- [To Understand React Fiber, You Need to Know About Threads](https://dev.to/afairlie/to-understand-react-fiber-you-need-to-know-about-threads-3dof)
- [A Beginner's Guide to React Fiber](https://morioh.com/p/808b67dca7b5)
- [A deep dive into React Fiber internals](https://blog.logrocket.com/deep-dive-into-react-fiber-internals/)
- [完全理解React Fiber](http://www.ayqy.net/blog/dive-into-react-fiber/)
- [React 源码深度解读（一）：首次DOM元素渲染 - Part 1](https://segmentfault.com/a/1190000016741764)
- [Making-a-custom-React-renderer](https://github.com/nitin42/Making-a-custom-React-renderer)
- [React的新引擎—React Fiber是什么？](http://www.infoq.com/cn/articles/what-the-new-engine-of-react)
- [react-fiber-implement](https://github.com/tranbathanhtung/react-fiber-implement)

## setState

- [浅入深出setState（下篇）](https://segmentfault.com/a/1190000015821018)

## Hook

- [react hooks源码深入浅出（一）](https://segmentfault.com/a/1190000038431635)
- [React Hooks 解析（上）：基础](https://segmentfault.com/a/1190000018928587)

## Changelog

- [React 16 升级总结](https://segmentfault.com/a/1190000017540511)


---


- https://github.com/Bogdan-Lyashenko/Under-the-hood-ReactJS
- [janryWang/react-study](https://github.com/janryWang/react-study)
- [purplebamboo/little-reactjs](https://github.com/purplebamboo/little-reactjs)

---

- https://medium.com/@ericchurchill/the-react-source-code-a-beginners-walkthrough-i-7240e86f3030
- Understanding The React Source Code

    - https://hackernoon.com/understanding-the-react-source-code-initial-rendering-simple-component-i-80263fe46cf1
    - https://hackernoon.com/understanding-the-react-source-code-initial-rendering-simple-component-ii-79e7e8bed56c
    - https://hackernoon.com/understanding-the-react-source-code-initial-rendering-simple-component-iii-69c2711c5f33
    - https://hackernoon.com/understanding-the-react-source-code-iv-e3c4b66da12c
    - https://hackernoon.com/understanding-the-react-source-code-v-812d69a79fb9
    - https://hackernoon.com/understanding-the-react-source-code-vi-fe91ea58737f
    - https://hackernoon.com/understanding-the-react-source-code-vii-b08ccb3b3f01
    - https://hackernoon.com/understanding-the-react-source-code-viii-b704eb4bf4d0
    - https://hackernoon.com/understanding-the-react-source-code-ix-949de347e5b9

- [深入理解react（源码分析）](https://github.com/lanjingling0510/blog/issues/1)
- [React 源码解析](https://zhuanlan.zhihu.com/p/28697362)
- [React 源码分析](https://www.gitbook.com/book/icepy/react/details)

---

- [React 源码剖析系列 － 不可思议的 react diff](https://zhuanlan.zhihu.com/p/20346379)

    ```
    1. React 底层执行过程：初始化、更新状态？
    2. React Diff 算法做了哪些优化？ —— https://zhuanlan.zhihu.com/p/20346379 
    3. 通过分析 React 源码，你最大的收获是什么？—— 性能优化（在开发组件时，保持稳定的 DOM 结构会有助于性能的提升。例如，可以通过 CSS 隐藏或显示节点，而不是真的移除或添加 DOM 节点。）
    ```

- [preact源码解析，从preact中理解react原理](https://zhuanlan.zhihu.com/p/100076938)

---

- [React技术揭秘](https://react.iamkasong.com/diff/prepare.html)

---

- v15升级到v16

    > React15架构分为两层，Reconciler(负责找出变化的组件)和Renderer(负责将变化的组件渲染到页面)，在React15及以前，Reconciler采用递归的方式创建虚拟DOM，递归过程是不能中断的。如果组件树的层级很深，递归会占用线程很多时间造成卡顿。
    >
    > 为了解决这个问题，React16进行了重构升级到了v16，React16的架构分为三层，Scheduler(负责调度任务)、Reconciler、Renderer。将递归的 无法中断的递归更新⚠️ 重构为 异步可中断的循环更新♻️，每次循环都会判断当前是否有剩余时间，这就是全新的Fiber架构。

- 

---
