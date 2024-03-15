# 18.x

- New Client and Server Rendering APIs
- Strict Mode
- Automatic Batching
- Concurrent Rendering

  Suspense, transitions, and streaming server rendering 等功能都是基于 Concurrent Rendering 实现的。

  ps：只有在使用 New Client API 创建的应用才支持新特性。

- Suspense on the server
- Transitions API
- New Hook API

    - useId：用于在客户端和服务器上生成唯一 ID，避免 hydration 时不一致；
    - useTransition 和 startTransition：将某些状态标记为不紧急；
    - useDeferredValue：类似于防抖，延迟渲染费紧急的部分；
    - useSyncExternalStore：用于同步外部的状态管理库；
    - useInsertionEffect：解决  CSS-in-JS 库解决在渲染中注入样式的问题。

## 参考文献

- [React v18.0](https://reactjs.org/blog/2022/03/29/react-v18.html)
- [The Plan for React 18](https://reactjs.org/blog/2021/06/08/the-plan-for-react-18.html)
- [React 18 Beta来了](https://segmentfault.com/a/1190000040966821)
- [4 Introducing React 18](https://github.com/reactwg/react-18/discussions/4)
- [React 18 Working Group](https://github.com/reactwg/react-18)
- [Automatic batching for fewer renders in React 18](https://github.com/reactwg/react-18/discussions/21)
- [SSR support for Suspense](https://github.com/reactwg/react-18/discussions/22)
- [React 18 is coming with new Features](https://medium.com/@externlabs/react-18-and-every-important-change-426f5a9cc919)
- [How to Upgrade to the React 18 Release Candidate](https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html)
- [How to support Reusable State in Effects](https://github.com/reactwg/react-18/discussions/18)
- [Replacing render with createRoot ](https://github.com/reactwg/react-18/discussions/5)
- [Exploring React 18’s three new APIs](https://blog.logrocket.com/exploring-react-18-three-new-apis/)
- [[译] React 18 新特性概览](https://juejin.cn/post/7014683796821770247#heading-7)
