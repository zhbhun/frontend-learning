## 性能分析器

- 浏览提交记录：

    React 分两个阶段工作：渲染和提交，开发者工具的 profiler 是在提交阶段收集性能数据的。

- 筛选提交记录：设置最小提交时间来过滤无关的记录
- 火焰图：火焰图会展示你所指定的那一次提交的应用程序的信息，图中的每一列都代表了一个 React 组件，（如：App，Nav）。列的大小和颜色代表渲染该组件及其子组件所需的耗时。
- 排序图

参考文献

- [Profiler API](https://zh-hans.reactjs.org/docs/profiler.html)
- [React Profiler 介绍](https://zh-hans.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html)
- [how to profiling in production mode for reat-dom] https://gist.github.com/bvaughn/25e6233aeb1b4f0cdb8d8366e54a3977

---

# [开发工具](https://github.com/facebook/react/blob/main/packages/react-devtools/README.md)

- [react-devtools](https://github.com/facebook/react/blob/main/packages/react-devtools/README.md)

    支持调试任意环境运行的 React 应用，

- [react-devtools-extensions](https://github.com/facebook/react/blob/main/packages/react-devtools-extensions/README.md)

    浏览器 React 调试工扩展

- [click-to-component](https://github.com/ericclemmons/click-to-component) - Option+Click React components in your browser to instantly open the source in VS Code


## 参考文献

- https://reactjs.org/community/debugging-tools.html
- [Introducing the New React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
