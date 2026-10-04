# 内存

- Chrome Performance：观察堆内存使用趋势，尝试多次如观察到为上涨趋势时就有可能是内存泄漏（并不能认定一定是内存泄漏，有可能是内存还没有释放），如果出现这种情况我们就要使用 memory 看板进行进一步的分析；
- Performance monitor：一边操作一边查看 performance monitor 
- Memory：对比操作前后的内存快照，观察 Delta 列观察增长较大的对象，可能存在内存泄漏的问题

## Memory

术语

- Summary：摘要视图

    - Constructor：类
    - Distance：当前对象到根的引用层级距离
    - Shallow Size：对象本身占用的内存
    - Retained Size：对象本身及其引用总共占用的内存

- Comparison：对比视图，与其它快照对比，看增、删、Delta数量及内存大小

    - Constructor：类
    - # New：对象实例新增数量
    - # Deleted：对象实例删除数量
    - # Delta：对比新增数量
    - Alloc. Size：新分配的内存
    - Freed Size：释放的内存
    - Size Delta：对比新增内存数量

- Containment：俯瞰视图，自顶向下看堆的情况，根节点包括 window 对象，GC root，原生对象等等

    - Object：对象实例
    - Distance：当前对象到根的引用层级距离
    - Shallow Size：对象本身占用的内存
    - Retained Size：对象本身及其引用总共占用的内存

## 参考文献

- [Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems/)
- [使用chrome工具进行内存泄漏排查](https://segmentfault.com/a/1190000039886452)
