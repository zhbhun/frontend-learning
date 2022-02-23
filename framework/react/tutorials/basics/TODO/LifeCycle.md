## 挂载

- constructor() >> static getDerivedStateFromProps() >> render() >> componentDidMount()
- constructor() >> componentWillMount() >> render() >> componentDidMount()

## 更新

- componentWillReceiveProps() >> shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
- shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
- static getDerivedStateFromProps() >> shouldComponentUpdate() >> render() >> getSnapshotBeforeUpdate() >> componentDidUpdate()

## 卸载

- componentWillUnmount()

## 错误

- [Introducing Error Boundaries](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html#introducing-error-boundaries)
- [componentDidCatch()](https://reactjs.org/docs/react-component.html#componentdidcatch)

## 常见问题

- getDerivedStateFromProps 不能和旧的生命周期函数一起使用（旧的生命周期不会被调用）；
- componentDidCatch 只能捕获子节点的异常，而且异常必须是在生命周期函数里抛出的；

### 什么时候使用 getDerivedStateFromProps 或 componentWillReceiveProps

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

- Reference

    - [You Probably Don't Need Derived State](https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)

## 参考文献

- [Understanding the React Component Lifecycle](http://busypeoples.github.io/post/react-component-lifecycle/)
