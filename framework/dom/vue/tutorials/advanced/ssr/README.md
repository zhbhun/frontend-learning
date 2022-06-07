# SSR

## 为什么？

- SEO
- 首屏加载速度
- 同构代码复用

存在问题

- 消耗服务端性能，如果并发量较高，需要优化性能；
- 开发存在服务端和客户端兼容限制，对开发人员要求更高；
- 静态站点更推荐使用 SSG；

## 怎么做？

- common：

    ```js
    import { createSSRApp, nextTick } from 'vue'
    import {
      createMemoryHistory,
      createRoute,
      createWebHistory,
    } from 'vue-router'
    import { createRouter } from './router'

    export function createApp(url?: string) {
      // 客户端也必须使用 createSSRApp，以便复用服务端渲染的 DOM
      const app = createSSRApp(App)
      const router = createRouter({
        // 服务端不支持浏览器 histor，所以质量使用 Memory History
        history: import.meta.env.SSR ? createMemoryHistory() : createWebHistory(),
        routes: []
      })
      app.use(router)
      if (url) {
        router.push(url)
      }
      // 需要等待 router 初始化好
      return router.isReady().then(() => app)
    }
    ```

- client

    ```js
    import { createApp } from './common'

    createApp().then(app => {
      app.mount('#app')
    })
    ```

- server

    ```js
    import { renderToString } from '@vue/server-renderer'
    import { createApp } from './common'

    export default function render() {
      return createApp().then(app => {
        app.mount()
        const ctx = {}
        const html = renderToString(app, ctx)
        return [html, ctx]
      })
    }
    ```

## 注意事项

- 在服务端渲染组件时不存在用户交互和 DOM 更新，为了提升性能服务端渲染禁用了响应式功能；
- 组件生命周期只有 beforeCreate 和 created；

    一些副作用代码需要放到 mouted 里执行

- 组件内不能直接访问平台特定的代码，需要做好环境判断；
- Hydration 不匹配时，vue 会尝试修复和调整预渲染的 DOM，但会损耗一些性能；
- 指令提供了额外的钩子 getSSRProps，用于服务端渲染；
- 服务端渲染不会处理 Teleport 组件，需要自行通过 context 获取 teleports 并放置到正确的位置，或者通过条件渲染来延迟到客户端渲染；
- 不支持单例的状态管理 store 和路由，每次请求都要新建 app、router 和 store；
- 首屏动态数据需要传递给客户端渲染；
- 页面跳转需要处理滚动位置；

## 参考

- [Server-Side Rendering (SSR)](https://vuejs.org/guide/scaling-up/ssr.html)
- [Server-Side Rendering API](https://vuejs.org/api/ssr.html)
