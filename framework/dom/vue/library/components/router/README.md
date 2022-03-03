# [路由](https://router.vuejs.org/)

## 安装

- CDN
- NPM
- Vue CLI

```js
import Vue from "vue";
import VueRouter from "vue-router";
import App from "./App.vue";

Vue.config.productionTip = false;

// 0. If using a module system (e.g. via vue-cli), import Vue and VueRouter
// and then call `Vue.use(VueRouter)`.
Vue.use(VueRouter);

// 1. Define route components.
// These can be imported from other files
const Foo = { template: "<div>foo</div>" };
const Bar = { template: "<div>bar</div>" };

// 2. Define some routes
// Each route should map to a component. The "component" can
// either be an actual component constructor created via
// `Vue.extend()`, or just a component options object.
// We'll talk about nested routes later.
const routes = [
  { path: "/foo", component: Foo },
  { path: "/bar", component: Bar }
];

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes // short for `routes: routes`
});

new Vue({
  router,
  render: (h) => h(App)
}).$mount("#app");
```

> https://codesandbox.io/s/vue-router-installation-nq3nc?file=/src/main.js

<iframe src="https://codesandbox.io/embed/vue-router-installation-nq3nc?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-router installation"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

## 入门

VueRouter =>[routes] router => route

- [VueRouter](https://router.vuejs.org/api/#router-construction-options)
- [routes](https://router.vuejs.org/api/#routes)
- [router](https://router.vuejs.org/api/#router-instance-properties)
- [route](https://router.vuejs.org/api/#route-object-properties)

### [动态路由匹配](https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes)

- 路径参数和多路径参数
- 路由参数变化监听

    - `{ watch: { $route(to, from) { /* ... */ } } }`
    - `beforeRouteEnter`、`beforeRouteUpdate`、`beforeRouteLeave`

- 404

ps：vue-router 按 route 定义顺序来判定优先级。

> https://codesandbox.io/s/vue-router-dynamic-route-matching-b0lhq?file=/src/App.vue

<iframe src="https://codesandbox.io/embed/vue-router-dynamic-route-matching-b0lhq?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-router Dynamic Route Matching"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

其他更多路由对象信息参考 [The Route Object](https://router.vuejs.org/api/#the-route-object)

### [嵌套路由](https://router.vuejs.org/guide/essentials/nested-routes.html)

- 嵌套路由的 path 以 `/` 开头表示根路径，否则表示嵌套路径
- 嵌套父组件即使有 redirect，component 也不能为空，否则子组件无法渲染

> https://codesandbox.io/s/vue-router-nested-routes-stmfh

<iframe src="https://codesandbox.io/embed/vue-router-installation-forked-stmfh?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-router Nested Routes"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

### [命名路由](https://router.vuejs.org/guide/essentials/redirect-and-alias.html)

TODO

### [重定向和别名](https://router.vuejs.org/guide/essentials/redirect-and-alias.html)

TODO

### [通过 props 传递路由信息](https://router.vuejs.org/guide/essentials/passing-props.html)

TODO

### [路由实例](https://router.vuejs.org/guide/essentials/navigation.html)

https://router.vuejs.org/api/#router-instance-methods

## 进阶

### [路由拦截](https://router.vuejs.org/guide/advanced/navigation-guards.html)

### [路由元信息](https://router.vuejs.org/guide/advanced/meta.html)

### [过渡动画](https://router.vuejs.org/guide/advanced/transitions.html)

> https://codesandbox.io/s/vue-router-transition-lnu3o?file=/src/main.js

<iframe src="https://codesandbox.io/embed/vue-router-transition-lnu3o?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-router Transition"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

### [滚动行为](https://router.vuejs.org/guide/advanced/scroll-behavior.html)

```js
scrollBehavior (to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition
  } else if (to.hash) {
    return {
      selector: to.hash
      // , offset: { x: 0, y: 10 }
    }
  } else {
    return { x: 0, y: 0 }
  }
}
```

- 新开页面可以重置滚动到顶部
- 前进和后退可以记住滚动位置

    ps：如果页面切换时存在过渡动画，需要异步返回记住的滚动位置，否则页面还没有完成切换，无法滚动到正确的问题

- 支持滚动到指定的元素和偏移位置

> https://codesandbox.io/s/vue-router-scroll-behavior-9df51?file=/src/main.js

<iframe src="https://codesandbox.io/embed/vue-router-scroll-behavior-9df51?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue-router Scroll Behavior"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

### 懒加载

TODO
