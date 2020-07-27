# 进阶

## [路由](https://cn.vuejs.org/v2/guide/routing.html)

```vue
const NotFound = { template: '<p>Page not found</p>' }
const Home = { template: '<p>home page</p>' }
const About = { template: '<p>about page</p>' }

const routes = {
  '/': Home,
  '/about': About
}

new Vue({
  el: '#app',
  data: {
    currentRoute: window.location.pathname
  },
  computed: {
    ViewComponent () {
      return routes[this.currentRoute] || NotFound
    }
  },
  render (h) { return h(this.ViewComponent) }
})
```

### [vue-router](https://github.com/vuejs/vue-router)

> http://router.vuejs.org/

#### 初始化

0. 集成路由插件
1. 定义路由组件
2. 定义路由
3. 创建 router 实例
4. 创建和挂载根实例
5. 使用 `this.$router`

#### 路由匹配

- 路由参数配置
- 响应路由参数的变化
- 捕获所有路由或 404 Not Found 路由
- 高级匹配模式（path-to-regexp）
- 匹配优先级

#### 嵌套路由

...

#### 编程时导航

- `router.push(location, onComplete?, onAbort?)`
- `router.replace(location, onComplete?, onAbort?)`
- `router.go(n)`

#### 命名路由

...

#### 命名视图

...

#### 重定向和别名

...

### 组件路由传参

...

### H5 history

...

### 导航事件

- 全局：前置、解析、后置
- 组件：beforeRouteEnter、beforeRouteUpdate、beforeRouteLeave

### [路由元信息](https://router.vuejs.org/zh/guide/advanced/meta.html)

...

## [状态管理](https://cn.vuejs.org/v2/guide/state-management.html)

![vuex](https://vuex.vuejs.org/vuex.png)

## [服务端渲染](https://cn.vuejs.org/v2/guide/ssr.html)
