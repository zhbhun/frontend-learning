# 严格模式

- 识别不安全的生命周期
- 检测过时的 context API
- 关于使用过时字符串 ref API 的警告
- 关于使用废弃的 findDOMNode 方法的警告
- 检测意外的副作用
- 确保可复用的 state

## 检测意外的副作用

React concurrent 模式会将渲染工作分解为多个部分，对任务进行暂停和恢复操作以避免阻塞浏览，这意味着 React 可以在提交之前多次调用渲染阶段生命周期的方法。严格模式下，会通过故意重复调用以下函数来实现副作用检测：

- constructor
- componentWillMount (or UNSAFE_componentWillMount)
- componentWillReceiveProps (or UNSAFE_componentWillReceiveProps)
- componentWillUpdate (or UNSAFE_componentWillUpdate)
- getDerivedStateFromProps
- shouldComponentUpdate
- render
- setState 更新函数（第一个参数）

参考文献：

- [React v18: Why useEffect Suddenly Got Crazy?](https://betterprogramming.pub/react-v18-why-useeffect-suddenly-go-crazy-db1b42eb2730)

测试示例：https://codesandbox.io/s/react-strict-mode-effect-detect-c3jd3p?file=/src/App.js:0-59

## 参考

- [严格模式](https://zh-hans.reactjs.org/docs/strict-mode.html)
