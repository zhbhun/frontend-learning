测试单页应用路由是否销毁对性能的影响。

- 销毁：如果前一个路由页面 DOM 节点较多，那么重新渲染耗时较长，在性能较差的设备上会出现页面卡住
- 不销毁：可能导致网页中的 DOM 节点过多，超过一定量后，页面容易卡顿
