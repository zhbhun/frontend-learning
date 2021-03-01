# vue3-tsx

vue3 + TSX + Composition API

- defineComponent
- vue Proptype + vuetype
- setup + tsx

## 问题

### Scoped Style

使用了 jsx 之后，无法在使用 vue 自带的 scoped style，备选方案是 css module

- [JSX with scoped styles, possible?](https://forum.vuejs.org/t/jsx-with-scoped-styles-possible/7523)
- [.vue 文件中使用 jsx, style 的 scoped 不起作用](https://github.com/vuejs/jsx-next/issues/51)
- [I want to use scoped in JSX. I don't know if I can? ](https://github.com/vuejs/vue-next/issues/2771)
- [这些 CSS-in-JS 库，谁更适合你](https://zhuanlan.zhihu.com/p/129670569)
- https://github.com/MicheleBertoli/css-in-js

### vue 文件 ts 类型丢失

ts 不支持 vue 文件，需要全局添加 `shims-vue.d.ts` 声明 vue 文件的输出模块类型，但是会丢失 props 类型推导

- [Cannot import from a typescript Vue component into another typescript Vue component](https://github.com/vuejs/vue/issues/5298)
- [vuetype](https://github.com/ktsn/vuetype)
- [vue + typescript 项目起手式](https://segmentfault.com/a/1190000011744210)

### JSX VS Template

JSX 的优点

- 类型检查：TypeScript 原生支持 TSX 语法，而不支持 SFC 的 template 语法

    使用 SFC 必须通过 shim 让 TS 可以引入 .vue 文件，但是对于所有 SFC 的组件的定义都是一样的，丢失了 props 类型检查。

- 灵活性：JSX 只是 JS 的语法糖，用法更加灵活，而 template 必须放在 SFC 文件里，存在很多限制：

    - 一个文件只能写一个组件（不便于代码拆分，如果没有拆分文件的情况下，SFC 代码阅读依赖较难）
    - 节点片段只能写在 template 里面，非常不灵活（不支持 renderProps，需要通过插槽实现，理解起来较难）
    - 变量绑定只能获取this上面的内容，不能使用全局变量（很多时候我们都要把全局变量先挂载到this上）

Template 的优点

- 没那么灵活，反而容易写出规范化的代码
- 可以实现编一阶段的模板优化，提升渲染性能

总结：考虑封装业务组件，需要借助 JSX 的灵活性和 TypeScript 的类型推导。

- [为什么我推荐使用JSX开发Vue3](https://juejin.cn/post/6911175470255964174)
- [为什么 Vue3 的组件库都在使用 jsx/tsx？](https://www.zhihu.com/question/436260027)
- [Vue 支持 jsx 语法和模版语法，为什么很少人用第一种，Vue3.0 后你更倾向于哪种？为什么？](https://www.zhihu.com/question/414874762)
- [为什么我推荐使用JSX开发Vue3](https://zhuanlan.zhihu.com/p/340424163)

## 参考文献

- [TypeScript Support](https://v3.vuejs.org/guide/typescript-support.html)
- [Render Functions](https://v3.vuejs.org/guide/render-function.html)
- [Composition API](https://v3.vuejs.org/api/composition-api.html)
- [vue-types](https://github.com/dwightjack/vue-types)


- [Vue3.0实践：使用Vue3.0做JSX(TSX)风格的组件开发](https://www.ctolib.com/topics-143214.html)
- [拥抱 Vue 3 系列之 JSX 语法](https://www.zoo.team/article/vue3-jsx)
- [拥抱 Vue3 系列之 JSX 语法](https://juejin.cn/post/6846687592138670094)
- [在Vue中使用JSX的正确姿势](https://zhuanlan.zhihu.com/p/37920151)
- [Vue3.0实践：使用Vue3.0做JSX(TSX)风格的组件开发](https://www.ctolib.com/topics-143214.html)
- [Vue3 体验](https://iiong.com/vue3-use-notes/#)
- [Vue3 Compiler 优化细节，如何手写高性能渲染函数](https://zhuanlan.zhihu.com/p/150732926)
- [Vue3 模板编译优化](https://segmentfault.com/a/1190000037800237)
- [拥抱 Vue3 系列之 JSX 语法 - 知乎](https://my.oschina.net/u/4351216/blog/4338778)
- [使用Vue 3.0做JSX(TSX)风格的组件开发](https://zhuanlan.zhihu.com/p/102668383)
