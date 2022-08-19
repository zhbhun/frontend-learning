# 组件

## 自定义组件

- [`createReactClass`](https://www.npmjs.com/package/create-react-class)
- Class Component：Component、PureComponent
- Function Component / memo

### `createReactClass`

已废弃

- mixins：支持
- 组件名称：displayName
- 属性校验：propTypes
- 默认属性：getDefaultProps
- 初始化状态：getInitialState
- 事件处理函数：自动处理

### Class Component

- mixins：不支持
- 组件名称：displayName
- 属性校验：propTypes
- 默认属性：defaultProps
- 初始化状态：`constructor() { this.state = {} }
- 事件处理函数：箭头函数或手动绑定 this 的函数

### Function Component

- 组件名称：displayName
- 属性校验：propTypes
- 默认属性：结构默认参数
- 初始化状态：无

## 内置组件

- [Fragment](https://zh-hans.reactjs.org/docs/react-api.html#reactfragment)
- [Portal](https://zh-hans.reactjs.org/docs/portals.html)

    1. Portal 提供了一种将子节点渲染到存在于父组件以外的 DOM 节点的优秀的方案。
    2. Portal 支持按 React 组件层级进行事件冒泡（即使实际 DOM 结构不是这样的）。

- [Profile](https://zh-hans.reactjs.org/docs/profiler.html)

    Profiler 测量一个 React 应用多久渲染一次以及渲染一次的“代价”。 

- [Suspense](https://zh-hans.reactjs.org/docs/react-api.html#reactsuspense)

## 属性默认值

- [React functional component default props vs default parameters](https://stackoverflow.com/questions/47774695/react-functional-component-default-props-vs-default-parameters)
- [eventually be deprecated (as per Dan Abramov, one of the core team](https://twitter.com/dan_abramov/status/1133878326358171650)

## 参考文献

- [React Element vs Component](https://www.robinwieruch.de/react-element-component/)
