# 生命周期

## 基础

- 16.3+：Modern Class
- 16.8+：Hook

### Legacy Class

- 挂载：constructor() >> componentWillMount() >> render() >> componentDidMount()
- 更新：

    - 属性：componentWillReceiveProps() >> shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
    - 状态：shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
    - 强刷：render() >> componentDidUpdate()

- 错误：componentDidCatch
- 销毁：componentWillUnmount()

### Modern Class

- 挂载：constructor() >> static getDerivedStateFromProps() >> render() >> componentDidMount()
- 更新：

    - 属性/状态：static getDerivedStateFromProps() >> shouldComponentUpdate() >> render() >> getSnapshotBeforeUpdate() >> componentDidUpdate()
    - 强刷：static getDerivedStateFromProps() >> srender() >> getSnapshotBeforeUpdate() >> componentDidUpdate()

    ps：16.3.x 版本的 `static getDerivedStateFromProps()` 只会在属性变化的时候才执行。

- 错误：componentDidCatch
- 销毁：componentWillUnmount()

### Hook

- `useEffect(() => () => void, [])`：在首次渲染时执行副作用函数，副作用函数可以返回一个函数，该函数会在组件销毁时执行
- `useEffect(() => () => void, [...dep])`：在每次依赖变化时执行副作用函数，副作用函数可以返回一个函数，该函数会在新的副作用函数处理前执行

## 进价

- getDerivedStateFromProps 不能和旧的生命周期函数一起使用（旧的生命周期不会被调用）；
- componentDidCatch 只能捕获子节点的异常，而且异常必须是在生命周期函数里抛出的；

### 错误边界处理

- [Introducing Error Boundaries](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html#introducing-error-boundaries)
- [componentDidCatch()](https://reactjs.org/docs/react-component.html#componentdidcatch)

### 为什么废弃 react 旧的生命周期函数？

getDerivedStateFromProps VS componentWillReceiveProps

- 使用场景：需要根据属性变化来更新组件内部状态
- 使用误区：使用内部状态来暂存基于属性计算出来的值（可以在 render 里计算，利用 [memoize-one](https://github.com/alexreardon/memoize-one) 做缓存）
- 错误用法：

    - 每次都更新内部状态
    - 属性和状态不匹配的时候就更新内部状态

- 解决方案

    - 使用完全控制的组件（没有内部状态）
    - 使用完全不受控制的组件，声明时指定一个 key
    - 根据 id 属性重置不受控制组件的内部状态
    - 使用不受控制组件上的实例方法来重置内部状态

参考文献

- [为什么废弃react生命周期函数？](https://segmentfault.com/a/1190000021272657)
- [You Probably Don't Need Derived State](https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)

### State 的更新可能是异步的

- 同步：事件回调处理
- 异步：生命周期函数

总结：总是使用 setState 回调函数的状态和属性传参来获取最新值。

TODO: 18.x 有变化

参考文献

- [今天让你彻底搞懂setState是同步还是异步](https://zhuanlan.zhihu.com/p/350332132)

## 参考文献

- [Understanding the React Component Lifecycle](http://busypeoples.github.io/post/react-component-lifecycle/)
