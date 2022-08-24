# 性能优化

- `shouldComponentUpdate`
- 使用压缩后的生产版本

    ps：React 默认包含了许多有用的警告信息。这些警告信息在开发过程中非常有帮助。然而这使得 React 变得更大且更慢，所以你需要确保部署时使用了生产版本。

- 使用开发者工具中的分析器对组件进行分析
- 虚拟化长列表

## 重复渲染

重新渲染的原因

- 状态变化
- 父组件重新渲染

    ps：memo 组件需要 props 发生变化才会重新渲染

- context 变化

最贱实践

- 反模式：在 render 函数中创建组件；
- state 下移到子组件中；
- 复杂组件作为 props 传递；

    有些状态需要在父级管理，可以将状态管理和使用该状态的组件提取到较小的组件中，并且可以将较复杂的组件作为 children props 传递给它。从较小的组件角度来看，children 只是 props，因此它们不会受到状态更改的影响，因此不会重新渲染。

    https://codesandbox.io/s/black-night-3gp4ev

- 使用 React.memo
- 使用 React.useCallback / React.useMemo
- 列表优化

    - 避免使用 index 作为 key
    - 列表项组件使用 memo 包装

- 避免 Context 引起 re-render

    - 将 Provider 的值做 memoize 处理
    - 对数据和 API 做拆分

        如果在 Context 中存在数据和 API 的组合（getter 和 setter），则可以将它们拆分为同一组件下的不同 Providers。
    
    - Context selector

        对于那些部分使用了 Context 值的组件，即使使用了 useMemo hooks 也无法避免组件的重新渲染。但是，我们可以使用高阶组件和 React.memo 可以伪造出 Context selector。

参考文献

- [Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/?utm_source=pocket_mylist)
- [【第2709期】一份详尽的 React re-render 指南](https://mp.weixin.qq.com/s?__biz=MjM5MTA1MjAxMQ%3D%3D&chksm=bd49231a8a3eaa0c95d352fa3297a139d3c20696d0d07cb72843d954a83ebbddb1d4500a00f8&fasttmpl_type=0&idx=1&lang=zh_CN&mid=2651257502&sn=88e7dbe3cbb1ebe9ff8521a40711c1ba)

## 参考文献

- [性能优化](https://zh-hans.reactjs.org/docs/optimizing-performance.html)
- [Optimizing Performance](https://reactjs.org/docs/react-component.html)
- [Improving Web Performance with React Hydration Strategies](https://medium.com/cdiscount-engineering/improving-web-performance-with-react-hydration-strategies-3117f71a1695)
- [why-did-you-render](https://github.com/welldone-software/why-did-you-render)
- [被diss性能差，Dan连夜优化React新文档](https://segmentfault.com/a/1190000041906367)
