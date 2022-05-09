# DOM Diff

背景：基于两棵树做 Diff 计算，生成将一棵树转换成另一棵树的最小操作次数。然而，即使使用最优的算法，该算法的复杂程度仍为 O(n 3 )，其中 n 是树中元素的数量。于是 React 在以下两个假设的基础之上提出了一套 O(n) 的启发式算法：

- Web UI 中 DOM 节点跨层级的移动操作特别少，可以忽略不计；
- 拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
- 开发者可以通过设置 key 属性，来告知渲染哪些子元素在不同的渲染下可以保存不变；

--

- tree diff：**react 只会对同一层次的节点进行比较**
- component diff：

    - 如果是同一类型的组件，按照原策略继续比较虚拟dom树；
    - 如果不是，则将该组件判断为 dirty component，从而替换整个组件下的所有子节点；
    
    ps：对于同一类型的组件，有可能其 Virtual DOM 没有任何变化，如果能够确切的知道这点那可以节省大量的 diff 运算的时间，因此 React 允许用户通过shouldComponentUpdate()判断该组件是否需要进行 diff

- element diff：当节点处于同一层级时，React diff提供了三种节点操作：插入、移动和删除

    - 插入：新的component类型不在老集合里 -> 全新的节点，需要对新节点执行插入操作
    - 移动：在老集合里有新component类型，且element是可更新的类型；
    - 删除：老的component类型，在新集合中也有，但对应的element不同则不能直接复用和更新，需要执行删除操作，或者老component不在新集合里，也需要执行删除操作

修改 DOM 的顺序：先删除，然后更新与移动，最后做插入操作


## vue vs react

差异点

- Vue基于snabbdom库，它有较好的速度以及模块机制。Vue Diff使用双向链表，边对比，边更新DOM。
- React主要使用diff队列保存需要更新哪些DOM，得到patch树，再统一操作批量更新DOM。

相同点

- 虚拟DOM在比较时只比较同一层级节点，复杂度都为 O(n)，降低了算法复杂度；
- 都使用key比较是否是相同节点，都是为了尽可能的复用节点
- 都是操作虚拟DOM，最小化操作真实DOM，提高性能（其实虚拟DOM的优势 并不是在于它操作DOM快）

## 参考

- [协调](https://zh-hans.reactjs.org/docs/reconciliation.html)
- [react和vue diff算法解析与对比](https://juejin.cn/post/6978370715573714952)
- [【React】深入理解虚拟dom和diff算法](https://juejin.cn/post/6844904165026562056)
- [详解：虚拟dom及dIff算法-一篇就够了（文章比较长，建议收藏）](https://juejin.cn/post/6844904078196097031)
- [框架对比】React和Vue的diff算法](https://juejin.cn/post/6878892606307172365)
- [react和vue diff算法解析与对比](https://juejin.cn/post/6978370715573714952)
- [聊一聊Diff算法（React、Vue2.x、Vue3.x）](https://zhuanlan.zhihu.com/p/149972619)
- [基于 Fiber 的 React Diff 算法源码分析](https://xie.infoq.cn/article/9771629d41f19743a08a1d481)
- [聊一聊Diff算法（React、Vue2.x、Vue3.x）](https://zhuanlan.zhihu.com/p/149972619)
