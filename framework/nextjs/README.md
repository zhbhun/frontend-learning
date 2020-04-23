https://nextjs.org
========

- https://github.com/zeit/next.js/
- https://nextjs.org/docs/
- https://nextjs.org/learn/

## 源码

https://github.com/zeit/next.js/tree/7.0.3

服务端渲染数据：`__NEXT_DATA__`

```js
{
  assetPrefix: string, // 资源前缀
  buildId: string, // 打包 ID
  page: string, // 当前路由
  query: object, // 路由参数
  err: object, // 错误对象
  props: string, // 服务端调用 App.getInitialProps -> Page.getInitialProps 返回的结果
}

```

客户端首屏

- [初始化](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L69)

    1. [加载 `'/_error'` 和 `'/_app'` 路由页面组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L76)
    2. [加载当前路由页面组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L76)
    3. [创建路由器](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L94)
    4. [注册路由器更新监听函数（更新后重新渲染）](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L103)
    5. [渲染应用](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L107)

        - App：应用组件
        - Component：路由组件
        - props: getInitialProps 返回值（首屏从服务端预渲染读取，二级页面再客户端调用返回后获取）
        - err：路由加载失败错误对象
        - 

- [渲染应用](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L112)

    1. [判断是否出错，出错的话渲染错误页面组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L113)
    2. [渲染路由组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L119)

- [渲染组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L159)

    1. [热加载刷新替换错误组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L162)
    2. [渲染 App 组件](https://github.com/zeit/next.js/blob/7.0.3/client/index.js#L179)

        - Component
        - err
        - router
        - headManager
        - ...props(getInitialProps)

客户端二级页面

- [路由切换](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L10)

    - back
    - push
    - replace
    - reload
    - prefetch

- [修改路由](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L143)

    1. [取消正在加载的路由](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L155)
    2. [加载目标路由](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L190)

        https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L231

        1. [加载路由组件](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L234)
        2. [调用路由初始化(getInitialProps)](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L247)
        
        如果路由加载失败

        - [脚本加载失败](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L251)：强制刷新
        - [组件初始化失败](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L270)：返回错误路由组件

    3. [event#beforeHistoryChange](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L199)
    4. [更新路由状态](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L200)

        调用 window.history 方法

    5. [event#routeChangeError](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L205)

        如果目标目标路由加载失败的话，触发路由错误信息

    6. [event#routeChangeComplete](https://github.com/zeit/next.js/blob/7.0.3/lib/router/router.js#L210)


## 问题

- https://stackoverflow.com/questions/tagged/next.js?sort=votes&pageSize=15

### 客户端渲染

- [progressive-render](https://github.com/zeit/next.js/tree/canary/examples/progressive-render)
- [Scroll position gets reset after setting on Safari](https://github.com/zeit/next.js/issues/2459)

### 区分客户端和服务端

- [I use a library which throws window is undefined]((https://github.com/zeit/next.js/wiki/FAQ))
- [react-no-ssr](https://github.com/kadirahq/react-no-ssr)
- [Document how to do stuff differently server-side vs. client-side](https://github.com/zeit/next.js/issues/1229)
- [How to conditionally include packages on client but not server (and vice-versa)?](https://github.com/zeit/next.js/issues/219)

### 路由切换

- [with-next-page-transitions](https://github.com/zeit/next.js/tree/canary/examples/with-next-page-transitions) / [next-page-transitions](https://github.com/illinois/next-page-transitions)
- [using-router](https://github.com/zeit/next.js/tree/canary/examples/using-router)
- [using-with-router](https://github.com/zeit/next.js/tree/canary/examples/using-with-router)
- [with-loading](https://github.com/zeit/next.js/tree/canary/examples/with-loading)
- [with-next-routes](https://github.com/zeit/next.js/tree/canary/examples/with-next-routes)

### 静态资源

- [Can't import static files like images ](https://github.com/zeit/next.js/issues/1935)
- [How to implement next-css and next-sass simultanously?](https://github.com/zeit/next.js/issues/3852)
- [Can't import static files like images](https://github.com/zeit/next.js/issues/1935)
- [Webpack loader for images to move them to static folder](https://github.com/zeit/next.js/issues/1825)
- [Unable to use self-hosted fonts using NextJS](https://github.com/zeit/next.js/issues/2645#issuecomment-323437479)
- [Handling images](https://github.com/zeit/next.js/issues/79)

- [https://github.com/arefaslani/next-images](https://github.com/arefaslani/next-images)
- https://github.com/cyrilwanner/next-optimized-images
- [babel-plugin-inline-import-data-uri](https://www.npmjs.com/package/babel-plugin-inline-import-data-uri)

### CSS 文件中的静态资源路径

- 暂时无解

### 服务端和客户端差异首屏

- https://github.com/facebook/react/issues/10591#issuecomment-344564375 / https://reactjs.org/docs/react-dom.html#hydrate
- [Document that you can't rely on React 16 SSR patching up differences](https://github.com/facebook/react/issues/10591)
- [What’s New With Server-Side Rendering in React 16](https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67)
- [SSR issue with dynamic responsive elements](https://github.com/zeit/next.js/issues/3866)
- [with-react-native-web - example - Expected server HTML to contain a matching `<div>` in `<div>`.](https://github.com/zeit/next.js/issues/4465)
- [Logic of with-react-i18next is incompatible with _app.js](https://github.com/zeit/next.js/issues/4532)
- [FOUC: Warning: Text content did not match. Server: "...css..." ](https://github.com/zeit/next.js/issues/3108)
- [React 16: Warning: Expected server HTML to contain a matching `<div>` in `<div>` due to State](https://stackoverflow.com/questions/46865880/react-16-warning-expected-server-html-to-contain-a-matching-div-in-div-due?rq=1)
- https://stackoverflow.com/questions/47439079/expected-server-html-to-contain-a-matching-element-in-parentelement?rq=1

### 无法自由定制静态资源名称

- TODO

### 定制项目结构

- [pages folder outside of root? ](https://github.com/zeit/next.js/issues/819)
- [Add configuration to specify `assetDirectory`](https://github.com/zeit/next.js/pull/2186)
- [Make file-system based routes optional for custom servers](https://github.com/zeit/next.js/pull/914)
- [Add configuration to specify the name of the `pages` directory.](https://github.com/zeit/next.js/pull/936)
- [Custom source directory ](https://github.com/zeit/next.js/issues/1455)
- [Add example of how to use next.js with other root directory. ](https://github.com/zeit/next.js/issues/2444)

### next-css 开发环境首次加载分页时样式丢失

- [Cant change page with 'next/link' & 'next-css'](https://github.com/zeit/next-plugins/issues/282#issuecomment-432127816)
- [extracted-loader](https://github.com/sheerun/extracted-loader)
- [css-hot-loader](https://github.com/shepherdwind/css-hot-loader)

### 样式

- [with-cxs](https://github.com/zeit/next.js/tree/canary/examples/with-cxs)
- [with-fela](https://github.com/zeit/next.js/tree/canary/examples/with-fela)

### 框架集成

- [using-inferno](https://github.com/zeit/next.js/tree/canary/examples/using-inferno)
- [using-nerv](https://github.com/zeit/next.js/tree/canary/examples/using-nerv)
- [using-preact](https://github.com/zeit/next.js/tree/canary/examples/using-preact)
- [with-antd-mobile](https://github.com/zeit/next.js/tree/canary/examples/with-antd-mobile)
- [with-ant-design](https://github.com/zeit/next.js/tree/canary/examples/with-ant-design)
- [with-apollo](https://github.com/zeit/next.js/tree/canary/examples/with-apollo)
- redux

    - [next-redux-wrapper](https://github.com/kirill-konshin/next-redux-wrapper)

- redux-saga

    - [Actions are lost after END is dispatched ](https://github.com/bmealhouse/next-redux-saga/issues/6)
    - [next-redux-saga](https://github.com/bmealhouse/next-redux-saga)
    - [Using Redux Saga with Next.js](https://medium.com/@victor36max/using-redux-saga-with-next-js-2b5d5add1ec6)

### 环境配置

- [with-absolute-imports](https://github.com/zeit/next.js/tree/canary/examples/with-absolute-imports)
- [with-asset-imports](https://github.com/zeit/next.js/tree/canary/examples/with-asset-imports)
- [with-babel-macros](https://github.com/zeit/next.js/tree/canary/examples/with-babel-macros)
- [with-configured-preset-env](https://github.com/zeit/next.js/tree/canary/examples/with-configured-preset-env)
- [with-custom-babel-config](https://github.com/zeit/next.js/tree/canary/examples/with-custom-babel-config)
- [with-custom-reverse-proxy](https://github.com/zeit/next.js/tree/canary/examples/with-custom-reverse-proxy)

### 集成框架

- https://github.com/unicodeveloper/awesome-nextjs
- [next-routes](https://github.com/fridays/next-routes)

## 参考文献

- [如何评价Next.js？](https://www.zhihu.com/question/52365623)
- https://github.com/redfin/react-server
- [Why I chose React + Next.js for my next website instead of Vue or Angular](https://medium.freecodecamp.org/use-react-with-next-js-framework-and-how-it-made-my-life-easier-4280b643451)
- [Next.js — React Server Side Rendering Done Right](https://hackernoon.com/next-js-react-server-side-rendering-done-right-f9700078a3b6)
- [使用Next.js构建React服务端渲染应用](https://segmentfault.com/a/1190000015578803)
- [最简单的服务端渲染框架-Next.js快速入门](https://zhuanlan.zhihu.com/p/25191863)
- [Next.js — React 完美的服务器端渲染框架](https://www.zcfy.cc/article/next-js-react-server-side-rendering-done-right-freecodecamp)
