# [Navigation API](https://wicg.github.io/navigation-api/)

window.navigation API 提供了操作和拦截导航的能力，以及对应用程序的历史导航记录进行访问。这为 window.history 和 window.location 提供了一个更有用的替代品，特别是 SPA 这种模式。

## Why

> SPA：在用户与网站互动时动态重写其内容，而不是默认的从服务器加载全新页面的方法。

虽然基于 [History API](https://developer.mozilla.org/zh-CN/docs/Web/API/History_API) 已经可以实现 SPA 了，但是 History API 过于简陋，不是专门为 SPA 量身定制的（早在 SPA 成为标准之前就开发出来了）。

如果开发人员在没有了解 History API 的情况下，想要基于 History API 实现类似 vue-router 路由守卫这种的功能时，会发现 `window.onpopstate` 只能监听到导航前进和后退的事件，无法监听到 push 或 replace 事件。此外，在使用超链接标签 `a` 或表单标签 `form` 时，触发的导航都不支持 SPA，像前端常用的路由库 vue-router 或 react-router 都会提供自己的 link 组件，用于实现 SPA 路由跳转。

在开源社区有不少针对 history 

Navigation API 提供一个全新的标准化客户端路由，专门为 SPA 定制，提供了完整的操作和拦截导航的能力，以及对应用程序的历史导航记录进行访问。

## 快速上手

## 导航切换

## 导航历史栈

## 导航状态

## 代码示例

## 实践应用

- 监听页面内的所有导航事件，包含超链接、表单、location 和 History API，可以用于做埋点上报或特殊的拦截处理；
- 访问历史路由栈，查看当前的导航在路由栈的索引位置，判断当前页面是否是进入应用时的首页，是否可以再后退和前进；
- 可以缓存页面状态，在导航恢复时可以恢复历史状态。

## 参考文献

- https://github.com/WICG/navigation-api
- https://caniuse.com/mdn-api_navigation
- [Modern client-side routing: the Navigation API](https://developer.chrome.com/docs/web-platform/navigation-api/)
- [Feature: Navigation API](https://chromestatus.com/feature/6232287446302720)
