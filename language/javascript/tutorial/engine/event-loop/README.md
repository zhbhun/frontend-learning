# Event Loop

- 宏任务: script, setTimeout, setInterval, setImmediate, I/O, UI rendering;
- 微任务: process.nextTick, Promise, Object.observe, MutationObserver;

## 基础

### [requestIdleCallback](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)

- [利用好浏览器的空闲时间 --- requestIdleCallback](https://www.cnblogs.com/Wayou/p/requestIdleCallback.html)
- [js 如何快速计算出文件hash值](https://juejin.cn/post/6932299991012769806)

## 参考文献

- [Node 定时器详解](https://www.ruanyifeng.com/blog/2018/02/node-event-loop.html)
- [JavaScript任务队列的顺序机制（事件循环）](http://www.yangzicong.com/article/3)
- [由setTimeout和setImmediate执行顺序的随机性窥探Node的事件循环机制](https://segmentfault.com/a/1190000013102056)
- [深入探究 eventloop 与浏览器渲染的时序问题](https://www.404forest.com/2017/07/18/how-javascript-actually-works-eventloop-and-uirendering/)
