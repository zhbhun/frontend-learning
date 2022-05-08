# 高阶组件

实现 Class 组件的代码逻辑复用。

## 最佳实践

- 不要改变原始组件，而应该使用组合。
- 将不相关的 props 传递给被包裹的组件

    HOC 为组件添加特性，应该透传与自身无关的 props，返回的组件与原组件应保持类似的接口。

- 最大化可组合性

    ```js
    // 不推荐如下写法...
    const EnhancedComponent = withRouter(connect(commentSelector)(WrappedComponent))

    // ... 建议编写组合工具函数
    // compose(f, g, h) 等同于 (...args) => f(g(h(...args)))
    const enhance = compose(
      // 这些都是单参数的 HOC
      withRouter,
      connect(commentSelector)
    )
    const EnhancedComponent = enhance(WrappedComponent)
    ```

- 包装显示名称以便轻松调试
- 不要在 render 方法中使用 HOC
- 务必复制静态方法

    [hoist-non-react-statics](https://github.com/mridgway/hoist-non-react-statics)

- 使用 forwardRef 处理 ref 传递问题

## 实际案例

- react-router withRouter
- redux connect
- relay createFragmentContainer

## 参考文献

- [高阶组件](https://zh-hans.reactjs.org/docs/higher-order-components.html)
- [React higher-order component hell](https://www.reddit.com/r/ProgrammerHumor/comments/9jhs67/react_higherorder_component_hell/)
