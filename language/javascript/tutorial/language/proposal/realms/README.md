# [Realms](https://github.com/tc39/proposal-realms)

Realms 提案提供了一种新的机制，可以**在新的全局对象和一组 JavaScript 内置对象的上下文中执行 JavaScript 代码**。

应用场景

- 基于 Web 的 IDE，或基于同源策略的执行任何类型的第三方代码。
- 测试框架，测试和模拟(e.g.: jsdom)
- 沙盒(e.g.: Oasis Project)
- 服务端渲染(解决冲突和数据泄露)
- DOM Virtualization (e.g.: Google AMP)

现有实现

- Nodejs：VM Module
- 浏览器：同源的 iframe

## 参考文献

- [realms-shim](https://github.com/Agoric/realms-shim)
- [详解 NodeJs 的 VM 模块](http://www.alloyteam.com/2015/04/xiang-jie-nodejs-di-vm-mo-kuai/)
