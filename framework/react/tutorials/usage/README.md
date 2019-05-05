# 用法详解

## JSX

- 使用花括号嵌入表达式；
- JSX 本身也是个表达式，编译后变成了正常的函数调用；
- 使用引号设置字符串字面量或者使用花括号设置表达式作为标签属性；
- 空标签可以使用 `/>` 直接关闭（类似于 XML），非空的可以设置子节点；
- JSX 自带防止 XSS 工具；
- JSX 编译后的代码是调用 `React.createElement()`，生成了一个对象实例，叫做 “React elements”，React 最终读取这个对象来构建 DOM。

    ```javascript
    // Note: this structure is simplified
    const element = {
      type: 'h1',
      props: {
        className: 'greeting',
        children: 'Hello, world!'
      }
    };
    ```

参考文献

- [Introducing JSX](https://reactjs.org/docs/introducing-jsx.html)
- [JSX In Depth](https://reactjs.org/docs/jsx-in-depth.html)
- [React Without JSX](https://reactjs.org/docs/react-without-jsx.html)

## Element

Element 是构建 React 应用的最小单元，一个 Element 代表着你想要在屏幕上渲染什么。

- Element 是一个普通对象，创建成本很低；
- 区分 Component：Element 是基于 Component 生成的；
- React 应用都有只有一个根 DOM 节点，这个节点下的所有 DOM 都由 React 管理；
- Element 是不可变的，一旦创建了一个 Element，那么你不可以修改它的 children 和 attributes，这有点像电影的每一帧，代表着应用在某一时刻的 UI，需要更新 UI 就要新建一个 Element；
- React 会与前一刻比较 Element 的 children 和 attributes，并且只更新有变动的 DOM 节点。

参考文献

- [Rendering Elements](https://reactjs.org/docs/rendering-elements.html)

## Component

Component 让我们可以将 UI 分成独立的，可重复使用的部分。从概念上讲，Component 有点像 JavaScript 函数，它们接受各种输入（`props`），并且返回 React Element。

### 组件设置

- `propTypes`：组件属性校验规则
- `defaultProps`：在组件属性为 `undefined` 时，使用 `defaultProps` 配置的默认值
- `displayName`：组件显示名称，用于调试信息，在开发环境里出错时可以打印出对应组件的 displayName 标识，以便快速定位错误。另外也用于 react-devtool 的组件树的组件命名。React 默认从组件函数或类推导出组件显示名称，在类似使用高阶组件内动态成的组件时，React 可能无法正确命名这种动态的组件，这个时候可以手动设置 `displayName`

### 组件写法

- 函数式组件
- 类组件

### 组件用法

React 将 JSX 标签中小写字母开头的字符当做 DOM 标签，大写字母开头的字符当做自定义组件。DOM 标签是内置标签的，而自定义组件必须出现在 JSX 的作用域里，并且自定义组件可以组合使用。

### 组件属性

Component 接受的输入都放在 `props` 内，而 `props` 是只读的，不允许组件直接修改自身的 `props`，这有点类似于纯函数，不能修改自身的参数

### 组件状态

`state` 类似于 `props`，但它是 Component 私有的，完全由 Component 自己控制。

- 不可以直接修改 `state`；
- `state` 更新是异步的；
- `state` 是通过合并的方式更新的；

`setState(updater[, callback])` 用法

- `updater` 可以是一个对象，会合并到当前组件状态里
- `updater` 可以是一个函数，其返回值是一个对象，会合并到当前组件状态里，`updater` 函数接收到的参数是最新的组件状态
- `callback` 是一个回调函数，在更新的状态对象合并到组件状态后调用

`setState` 更新状态是异步的

- 在组件的事件处理函数里连续调用多次 `setState`，组件只会重新渲染一次，并且状态更新是异步的，意味着在 `setState` 之后访问组件状态时，组件状态还没有更新

    如果需要多次调用 `setState`，并且后面的 `setState` 依赖前面的 `setState` 更新的状态，可以将 `updater` 设置为函数，该函数会接收一个最新状态。

- 在 React16 和早期版本里的非事件处理函数（数据请求的回调等）调用多次 `setState`，状态更新是同步的（立即更新组件状态并重新 render，再执行后续代码），但在将来 React 会改变这一行为，所有的 `setSate` 都是异步批量更新组件状态的。


参考文献

- [Does React keep the order for state updates?](https://stackoverflow.com/questions/48563650/does-react-keep-the-order-for-state-updates/48610973#48610973)
- [why is `setState` asynchronous?](https://github.com/facebook/react/issues/11527#issuecomment-360199710)

### 生命周期

- [Lifecycle Methods](https://reactjs.org/docs/react-component.html#reference)
- [Update on Async Rendering](https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html)
- [rename-unsafe-lifecycles](https://github.com/reactjs/react-codemod#rename-unsafe-lifecycles)
- [State and Lifecycle](https://reactjs.org/docs/state-and-lifecycle.html)

#### 执行顺序

- 初始化

    - ^16.0.0：constructor > getDerivedStateFromProps > render > ref > componentDidMount
    - ^15.0.0：constructor > componentWillMount > render > ref > componentDidMount

- 属性变化

    - ^16.0.0：getDerivedStateFromProps > shouldComponentUpdate > render > getSnapshotBeforeUpdate > componentDidUpdate
    - ^15.0.0：componentWillReceiveProps > shouldComponentUpdate > componentWillUpdate > render > componentDidUpdate

- 状态变化

    - ^16.0.0：getDerivedStateFromProps > shouldComponentUpdate > render > getSnapshotBeforeUpdate > ref > componentDidUpdate
    - ^15.0.0：shouldComponentUpdate > componentWillUpdate > render > componentDidUpdate

- 强制更新

    - ^16.0.0：getDerivedStateFromProps > render > getSnapshotBeforeUpdate > componentDidUpdate
    - ^15.0.0：componentWillUpdate > render > componentDidUpdate

- 错误：getDerivedStateFromError / componentDidCatch
- 销毁：componentWillUnmount > ref

参考文献

- [React Lifecycle Methods diagram](https://github.com/wojtekmaj/react-lifecycle-methods-diagram)
- [React Native 中组件的生命周期](https://race604.com/react-native-component-lifecycle)

#### 周期详解

- [getDerivedStateFromProps](https://reactjs.org/docs/react-component.html#static-getderivedstatefromprops)

    - 副作用
    - 衍生状态
    - 重置状态

    参考文献

    - [You Probably Don't Need Derived State](https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)

- [getSnapshotBeforeUpdate](https://reactjs.org/docs/react-component.html#getsnapshotbeforeupdate)

    在更新 DOM 之前调用，可以用来获取 DOM 更新前的一些信息，必须要有个返回值，并且返回值作为 componentDidUpdate 的第三个参数。使用场景：

    - 聊天列表：往上翻阅历史消息时，会加载出更多的信息。在这些信息插入到列表 DOM 前（getSnapshotBeforeUpdate），可以获取当前信息滚动位置距离底部的高度。在更新 DOM 后（componentDidUpdate），使用前面获取的高度来算出当前显示消息的新滚动位置。
    - ...

- [getDerivedStateFromError / componentDidCatch](https://reactjs.org/docs/react-component.html#error-boundaries)

    触发逻辑

    - 可以捕捉构造函数，生命周期函数和渲染函数抛出的错误；
    - 只捕捉子组件的错误，无法捕捉组件自身抛出的错误；

    getDerivedStateFromError VS componentDidCatch

    getDerivedStateFromError 是在 render 阶段调用的，不允许执行带副作用的代码，而 componentDidCatch 内可以执行副作用代码，例如进行日志记录。虽然目前 React 还是允许在 componentDidCatch 里调用 setState 来代替 getDerivedStateFromError，但是以后的版本会废弃这种用法。建议状态更新放在 getDerivedStateFromError 内处理，副作用代码放在 componentDidCatch 执行。


    参考文献

    - [Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
    - [Error Handling in React 16](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html)

- [render](https://reactjs.org/docs/react-component.html#render)

    render 是类组件写法中唯一要求实现的方法，返回值必须是以下类型：

    - React Element：JSX 生成的 React 元素
    - Array / Fragment：可以渲染多个元素
    - Portal：将子组件渲染到其他的（非父级） DOM 节点上
    - String / Number：渲染成 DOM 的文本节点
    - Boolean / null：不渲染任何东西

    render 方法通常是一个纯函数，不允许在 render 内做以下操作

    1. 修改组件状态；
    2. 直接操作 DOM；

### 数据流

`state` 是 Component 本地封装起来，不允许其他任何组件访问它，Component 也不应该关心它的父组件或子组件是有状态的还是无状态的。也就是说子组件无法直接访问和修改父组件的状态，只能由父组件通过 `props` 来向子组件传递信息。这通常被称为是自上而下的单向数据流，任何状态只能交给自身组件维护，任何基于组件状态生成的数据和 UI 只能影响组件树中对应组件下的组件节点。

### 组件引用

- [Forwarding Refs](https://reactjs.org/docs/forwarding-refs.html)
- [Refs and the DOM](https://reactjs.org/docs/refs-and-the-dom.html)

### 高阶组件

[Higher-Order Components](https://reactjs.org/docs/higher-order-components.html)

### 代码划分

[Code-Splitting](https://reactjs.org/docs/code-splitting.html)

### Context

[Context](https://reactjs.org/docs/context.html)

### Fragments

[Fragments](https://reactjs.org/docs/fragments.html

### 最佳实践

- 通关将状态提升到父级组件管理来实现组件之间的通信
- 通过组合来实现代码复用，而不是继承

### 参考文献

- [Components and Props](https://reactjs.org/docs/components-and-props.html)
- [State and Lifecycle](https://reactjs.org/docs/state-and-lifecycle.html)
- [Conditional Rendering](https://reactjs.org/docs/conditional-rendering.html)
- [Lists and Keys](https://reactjs.org/docs/lists-and-keys.html) / [Index as a key is an anti-pattern](https://medium.com/@robinpokorny/index-as-a-key-is-an-anti-pattern-e0349aece318)
- [Lifting State Up](https://reactjs.org/docs/lifting-state-up.html)
- [Composition vs Inheritance](https://reactjs.org/docs/composition-vs-inheritance.html)
- [Thinking in React](https://reactjs.org/docs/thinking-in-react.html)
- [React Without ES6](https://reactjs.org/docs/react-without-es6.html)
- [Render Props](https://reactjs.org/docs/render-props.html)
- [Typechecking With PropTypes](https://reactjs.org/docs/typechecking-with-proptypes.html)

## 事件处理

事件绑定（区分 DOM 事件）

- React 时间名使用驼峰形式命名；
- 在 JSX 中需要设置函数作为事件处理器，而不是字符串脚本。

[事件对象（`SyntheticEvent`）](https://reactjs.org/docs/events.html#overview)

[事件池机制](https://reactjs.org/docs/events.html#overview)

[支持的事件](https://reactjs.org/docs/events.html#overview)

参考文献

- [Handling Events](https://reactjs.org/docs/handling-events.html)
- [SyntheticEvent](https://reactjs.org/docs/events.html)

## DOM

### DOM Elements

| React | DOM |
| --- | --- |
| `<xxx className="">` | `<xxx class="">` |
| `<xxx htmlFor="">` | `<xxx for="">` |
| `<input defaultValue="">` / `<input value="">` | `<input value="">` |
| `<input type="checkbox" defaultChecked>` / `<input type="checkbox" checked>` | `<input type="checkbox" checked>` |
| `<input type="radio" defaultChecked>` / `<input type="radio" checked>` | `<input type="radio" checked>` |
| `<select defaultValue="">` / `<select value="">` / `<select multiple value={[""]}>` | `<select><option selected></select>` |
| `<textarea defaultValue>` / `<textarea value>` | `<textarea>...</textarea>` |

参考文献

- [DOM Elements](https://reactjs.org/docs/dom-elements.html)

### Forms

- [Forms](https://reactjs.org/docs/forms.html)
- [Uncontrolled Components](https://reactjs.org/docs/uncontrolled-components.html)
- [Controlled and uncontrolled form inputs in React don't have to be complicated](https://goshakkk.name/controlled-vs-uncontrolled-inputs-react/)

### DOM APIs

- `ReactDOM.render(element, container[, callback])`：将 React Element 渲染到指定的 DOM 容器里，并且返回组件的实例引用（如果渲染的是无状态组件，则返回 `null`）。

    - render 不会修改 container 自身的属性，只会修改子节点
    - render 会控制 container 的展示内容，container 原有的子节点都会被替换掉，后续使用 React DOM Diff 来更新
    - callback 是一个可选的参数，在组件被渲染或更新后调用

- hydrate()
- unmountComponentAtNode()
- findDOMNode()
- createPortal()
- renderToString()
- renderToStaticMarkup()

参考文献

- [ReactDOM](https://reactjs.org/docs/react-dom.html)
- [ReactDOMServer](https://reactjs.org/docs/react-dom-server.html)
- [Portals](https://reactjs.org/docs/portals.html)

## 测试

测试教程

- [Test Utilities](https://reactjs.org/docs/dom-elements.html)
- [Test Renderer](https://reactjs.org/docs/test-renderer.html)

测试工具

- 框架

    - [Jest](https://jestjs.io/docs/en/tutorial-react)

- 断言库
    
    - Jest 内置断言库

- 渲染容器

    - [jsdom](https://github.com/jsdom/jsdom)
    - [react-test-renderer](https://www.npmjs.com/package/react-test-renderer)

- 协助工具：协助操作 React 组件，简化 React 的测试。

    - [Enzyme](https://github.com/airbnb/enzyme/)
    - [react-testing-library](https://github.com/kentcdodds/react-testing-library)

测试方案：框架 + 断言库 + 渲染容器 + 辅助工具（）

- Jest + Enzyme
- Jest + jsdom + react-testing-library
- Jest + react-test-renderer：使用 Jest 镜像功能

## 集成

- [Integrating with Other Libraries](https://reactjs.org/docs/integrating-with-other-libraries.html)
- [Static Type Checking](https://reactjs.org/docs/static-type-checking.html)
- [Web Components](https://reactjs.org/docs/web-components.html)

## 优化

- [Optimizing Performance](https://reactjs.org/docs/optimizing-performance.html)
- [Strict Mode](https://reactjs.org/docs/strict-mode.html)

## 原理

- [Reconciliation](https://reactjs.org/docs/reconciliation.html)
- [Shallow Renderer](https://reactjs.org/docs/shallow-renderer.html)
- [Virtual DOM and Internals](https://reactjs.org/docs/faq-internals.html)
- [JavaScript Environment Requirements](https://reactjs.org/docs/javascript-environment-requirements.html)
- [Glossary of React Terms](https://reactjs.org/docs/glossary.html)

## 贡献

- [How to Contribute](https://reactjs.org/docs/how-to-contribute.html)
- [Codebase Overview](https://reactjs.org/docs/codebase-overview.html)
- [Implementation Notes](https://reactjs.org/docs/implementation-notes.html)
- [Design Principles](https://reactjs.org/docs/design-principles.html)
