# JSX

- [WTF is JSX](https://jasonformat.com/wtf-is-jsx/)

## 基础

### 内置组件

大多数组件和 HTML 一样，并扩展和修改了一些组件的用法。

- selected 和 option：需要在 select 组件上设置 value，而不是 option 上设置 selected
- Fragment
- Protal

### 组件命名

- 驼峰命名
- 特殊命名属性：className、htmlFor、dangerouslySetInnerHTML、suppressContentEditableWarning、suppressHydrationWarning

    ps：如果在 React 中使用 Web Components，请使用 class 属性代替。

- data：同 HTML，使用连字符
- a11y：同 HTML，使用连字符号

### 组件 Class

### 组件样式

- 小驼峰命名
- 自行添加浏览器前缀来兼容旧版浏览器（除了 ms 外，其他前缀都是大驼峰）

### [条件渲染](https://zh-hans.reactjs.org/docs/conditional-rendering.html)

- 条件返回
- 元素变量
- 三元表达式
- 与运算符
- 立即执行函数表达式 (IIFEs)
- [jsx-control-statements](https://github.com/AlexGilleran/jsx-control-statements)

参考

- [Good advice on JSX conditionals](https://thoughtspile.github.io/2022/01/17/jsx-conditionals/)
- [Conditional rendering in React: 9 methods with examples](https://blog.logrocket.com/conditional-rendering-in-react-c6b0e5af381e/)
- [7 Ways to Implement Conditional Rendering in React Applications](https://www.digitalocean.com/community/tutorials/7-ways-to-implement-conditional-rendering-in-react-applications)
- [jsx-control-statements](https://github.com/AlexGilleran/jsx-control-statements)
- https://flexiple.com/react/conditional-rendering-in-react/

### [列表](https://zh-hans.reactjs.org/docs/lists-and-keys.html)

- [Index as a key is an anti-pattern](https://robinpokorny.medium.com/index-as-a-key-is-an-anti-pattern-e0349aece318)

### [Fragments](https://zh-hans.reactjs.org/docs/fragments.html)

- `<Fragment></Fragment>`
- `<></>`
- `<Fragment key=""></Fragment>`


## 参考

- [JSX 简介](https://zh-hans.reactjs.org/docs/introducing-jsx.html)
- [DOM 元素](https://zh-hans.reactjs.org/docs/dom-elements.html)
- [深入 JSX](https://zh-hans.reactjs.org/docs/jsx-in-depth.html)
- [不使用 JSX 的 React](https://zh-hans.reactjs.org/docs/react-without-jsx.html)
