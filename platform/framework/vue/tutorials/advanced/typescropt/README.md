# TypeScript 集成


vue3 + TSX + Composition API

- defineComponent
- vue Proptype + vuetype
- setup + tsx

---

- [TypeScript Support](https://v3.vuejs.org/guide/typescript-support.html)
- [Render Functions](https://v3.vuejs.org/guide/render-function.html)
- [Composition API](https://v3.vuejs.org/api/composition-api.html)
- [vue-types](https://github.com/dwightjack/vue-types)

## 常见问题

### @vue/babel-plugin-jsx vs @vue/babel-preset-jsx

- [@vue/babel-plugin-jsx](https://github.com/vuejs/jsx-next)：适用于 vue3 版本
- [@vue/babel-preset-jsx](https://github.com/vuejs/jsx/tree/master/packages/babel-preset-jsx)：适用于 vue2 版本

### Scoped Style

使用了 jsx 之后，无法在使用 vue 自带的 scoped style，备选方案是 css module

- [JSX with scoped styles, possible?](https://forum.vuejs.org/t/jsx-with-scoped-styles-possible/7523)
- [.vue 文件中使用 jsx, style 的 scoped 不起作用](https://github.com/vuejs/jsx-next/issues/51)
- [I want to use scoped in JSX. I don't know if I can? ](https://github.com/vuejs/vue-next/issues/2771)
- [这些 CSS-in-JS 库，谁更适合你](https://zhuanlan.zhihu.com/p/129670569)
- https://github.com/MicheleBertoli/css-in-js

### vue 文件 ts 类型丢失

ts 不支持 vue 文件，需要全局添加 `shims-vue.d.ts` 声明 vue 文件的输出模块类型，但是会丢失 props 类型推导。

```ts
/* eslint-disable */

declare module '*.less';

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

- [Cannot import from a typescript Vue component into another typescript Vue component](https://github.com/vuejs/vue/issues/5298)
- [vuetype](https://github.com/ktsn/vuetype)
- [vue + typescript 项目起手式](https://segmentfault.com/a/1190000011744210)

### vue emit 事件不支持 ts 类型

```ts
// vue-tsx-shim.d.ts
import 'vue'

type EventHandler = (...args: any[]) => void

declare module 'vue' {
  interface ComponentCustomProps {
    role?: string
    tabindex?: number
    // should be removed after Vue supported component events typing
    // see: https://github.com/vuejs/vue-next/issues/1553
    //      https://github.com/vuejs/vue-next/issues/3029
    onBlur?: EventHandler
    onOpen?: EventHandler
    onEdit?: EventHandler
    onLoad?: EventHandler
    onClose?: EventHandler
    onFocus?: EventHandler
    onInput?: EventHandler
    onClick?: EventHandler
    onPress?: EventHandler
    onScale?: EventHandler
    onCancel?: EventHandler
    onClosed?: EventHandler
    onChange?: EventHandler
    onDelete?: EventHandler
    onOpened?: EventHandler
    onScroll?: EventHandler
    onSubmit?: EventHandler
    onSelect?: EventHandler
    onToggle?: EventHandler
    onConfirm?: EventHandler
    onPreview?: EventHandler
    onKeypress?: EventHandler
    onTouchend?: EventHandler
    onClickStep?: EventHandler
    onTouchmove?: EventHandler
    onTouchstart?: EventHandler
    onTouchcancel?: EventHandler
    onSelectSearch?: EventHandler
    [key: string]: any
  }
}
```

- [[Bug Report] tsx下，组件缺少事件的typescript定义](https://github.com/youzan/vant/issues/8302)
- [[TypeScript / TSX] Make component events type safe, both emitting and listening](https://github.com/vuejs/vue-next/issues/1553)
- [Vue v-on:click.native in JSX?](https://stackoverflow.com/questions/51198226/vue-v-onclick-native-in-jsx)

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

> 说下为什么选择 vue + composition api + tsx 
>
> 1、vue + composition api + tsx 有点类似与 react + rebox，如果你使用过 react 和它的 hook，会觉得 vue + composition + tsx 就是自己想要的理想开发方案，这主要是个人经验影响哈。实际上大家熟悉了这一套，以后切到 react，对 react hook + rebox 也不会陌生。
>
> 2、对比 template，tsx 会更加的灵活，这在一些复杂的业务场景特别有用，当然我们平时写的业务会比较简单，一些大佬会说我简单的业务用 template，复杂了再用 tsx，但是在不熟悉 tsx 的情况下，开发人员遇到复杂业务也只会用 template 去各种绕的方式写。为什么说 tsx 灵活，可以参考 https://juejin.cn/post/6911175470255964174
>
> 3、很多大佬说 jsx 没有 template 的编译优化，更加灵活容易写出各种各样风格的代码，但实际上 template 编译优化在我们目前的业务中提升不大，而且我们用的 vant 、ant-design 组件库本身就是 tsx 开发的。
>
> 4、对比 tempate，tsx 基本上支持 TypeScript 类型推导，在后期维护和重构上开发效率更高，而且能够完整的使用到 vant、ant-design 这些库提供的 ts 类型推导和编译校验。
>
> 5、后面我们要开发各个端的公共库，封装各种抽象业务组件，用来提升开发效率和用户体验，这里 tsx 的类型推导很重要，目前后台开发框架已经开发了类似 AdminSearch，已经后续规划的 JSON Schema 表单，都需要有类型推导的支撑。
>
> 6、jsx 不是 jsp，jsx 是一种 js 语法糖，编译后就是函数调用，目前这种直接声明式的在代码里构建 ui 的方式已经被很多新框架借鉴，包括原生的开发框架 flutter、swiftui 等，而且对比这些框架，jsx 更加的容易理解。
>
> 我自己对 template 是由偏见的，借用社区大佬的话说：JSX 的表达能力比 template 更强，JSX 表达能力的上限是 JS 语言本身，而 template 表达能力的上限是 Vue 的各种指令如 v-if v-for v-bind ...。面试过很多只会 vue template 的人，对应的开发很多都是围绕着 vue template 去研究各种指令、插槽等语法，而对 JS 本身掌握不够，所以我更希望大家去研究 JS 函数式编程方式，理解闭包的应用和响应式原理，而不是在 vue template 做“配置化”的工程师。

---

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

### 热加载

- [vueComponent/vue-jsx-hot-loader](https://github.com/vueComponent/vue-jsx-hot-loader)
- [skyrpex/vue-jsx-hot-loader](https://github.com/skyrpex/vue-jsx-hot-loader)
- [使用Vue 3.0做JSX(TSX)风格的组件开发](https://github.com/hujiulong/blog/issues/11#issuecomment-759313229)
- [How to enable hot reload for `.tsx` files in Vue 3?](https://stackoverflow.com/questions/67597975/how-to-enable-hot-reload-for-tsx-files-in-vue-3)

### 其他

- [为什么我感觉 Vue 3 TypeScript 还是不行？](https://www.zhihu.com/question/453332049)

    - props 不支持直接使用 TypeScript 类型声明
    - 难以定义不同组件的共有 props
    - defineComponent 不支持泛型
    - emit、slots 不支持 TypeScript 类型推导
