# [qiankun](https://qiankun.umijs.org/zh)

## 特性

基于 single-spa 开发，拥有它的优点的同时提供了增强的特性：

- HTML entry 的方式引入子应用，相比 js entry 极大的降低了应用改造的成本；
- 完备的沙箱方案，js 沙箱做了 SnapshotSandbox、LegacySandbox、ProxySandbox 三套渐进增强方案，css 沙箱做了 strictStyleIsolation、experimentalStyleIsolation 两套适用不同场景的方案；
- 做了静态资源预加载能力；

缺点

- 适配成本比较高，工程化、生命周期、静态资源路径、路由等都要做一系列的适配工作；
- css 沙箱采用严格隔离会有各种问题，js 沙箱在某些场景下执行性能下降严重；
- 无法同时激活多个子应用，也不支持子应用保活；
- 无法支持 vite 等 esmodule 脚本运行；

## 参考文献

- [30分钟快速掌握微前端qiankun的所有核心技术](https://ths.js.org/2021/01/31/30%E5%88%86%E9%92%9F%E5%BF%AB%E9%80%9F%E6%8E%8C%E6%8F%A1%E5%BE%AE%E5%89%8D%E7%AB%AFqiankun%E7%9A%84%E6%89%80%E6%9C%89%E6%A0%B8%E5%BF%83%E6%8A%80%E6%9C%AF/)
- [目标是最完善的微前端解决方案 - qiankun 2.0](https://github.com/kuitos/kuitos.github.io/issues/45)
- [微前端连载 6/7：微前端框架 - qiankun 大法好](https://juejin.cn/post/6846687602439897101)
- [基于qiankun的微前端最佳实践 -（同时加载多个微应用） - 掘金 (juejin.cn)](https://juejin.cn/post/6986258669172490271#heading-30)
