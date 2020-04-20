# Preact VS React

新增特性：

- this.props 和 this.state 自动传进了 render() 作为参数；
- 可以使用 class 作为 CSS 的类，className 也仍然被支持；
- render() 接受第三个布尔类型的参数，表示是否替换元素的子节点，默认 false，表示追加内容。

缺失特性：

- PropType：Preact 默认不支持 PropTypes 验证，但在集成 preact/debug 后可以是实现该功能；
- Children：Preact 默认 props.chidlren 总是一个数组，所以不需要 Children，但在 preact/compact 已经完整支持了 React.Children，支持不同类型的 props.chidren；
- Synthetic Events：Preact 使用原生事件

## 参考文献

- [Preact 与 React 的不同之处](https://preactjs.com/guide/v8/differences-to-react)
