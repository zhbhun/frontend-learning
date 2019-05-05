性能优化
========

## 性能指标

- 加载性能

    - 白屏时间
    - 首屏时间
    - 用户可操作时间
    - 页面总下载时间

- 动画性能

## 浏览器原理

- [原来JavaScript是这样运行的](https://juejin.im/post/5c6a732151882528735f2d33?)
- [浏览器与Node的事件循环(Event Loop)有何区别?](https://juejin.im/post/5c337ae06fb9a049bc4cd218)
- [HTML系列：macrotask和microtask](https://zhuanlan.zhihu.com/p/24460769)
- [Difference between microtask and macrotask within an event loop context](https://stackoverflow.com/questions/25915634/difference-between-microtask-and-macrotask-within-an-event-loop-context)
- [[译] 理解 JavaScript 中的执行上下文和执行栈](https://juejin.im/post/5ba32171f265da0ab719a6d7)

### JavaScript 主线程工作原理

> 浏览器解析渲染 DOM Tree 和 CSS Tree，解析执行 JavaScript，几乎所有的操作都是在主线程中执行。因为 JavaScript 可以操作 DOM，影响渲染，所以 JavaScript 引擎线程和 UI 线程是互斥的。换句话说，JavaScript 代码执行时会阻塞页面的渲染。
>
> ![JavaScript 主线程工作原理](./images/javascript-main-thread.webp)
>
> 图中的几个关键角色：
>
> Call Stack：调用栈，即 JavaScript 代码执行的地方，Chrome 和 NodeJS 中对应 V8 引擎。当它执行完当前所有任务时，栈为空，等待接收 Event Loop 中 next Tick 的任务。
>
> Browser APIs：这是连接 JavaScript 代码和浏览器内部的桥梁，使得 JavaScript 代码可以通过 Browser APIs 操作 DOM，调用 setTimeout，AJAX 等。
>
> Event queue: 每次通过 AJAX 或者 setTimeout 添加一个异步回调时，回调函数一般会加入到 Event queue 当中。
>Job queue: 这是预留给 promise 且优先级较高的通道，代表着“稍后执行这段代码，但是在 next Event Loop tick 之前执行”。它属于 ES 规范，注意区别对待，这里暂不展开。
>
> Next Tick: 表示调用栈 call stack 在下一 tick 将要执行的任务。它由一个 Event queue 中的回调，全部的 job queue，部分或者全部 render queue 组成。注意 current tick 只会在 Job queue 为空时才会进入 next tick。这就涉及到 task 优先级了，可能大家对于 microtask 和 macrotask 更加熟悉，这里不再展开。
>
> Event Loop: 它会“监视”（轮询）call stack 是否为空，call stack 为空时将会由 Event Loop 推送 next tick 中的任务到 call stack 中。
>
> 在浏览器主线程中，JavaScript 代码在调用栈 call stack 执行时，可能会调用浏览器的 API，对 DOM 进行操作。也可能执行一些异步任务：这些异步任务如果是以回调的方式处理，那么往往会被添加到 Event queue 当中；如果是以 promise 处理，就会先放到 Job queue 当中。这些异步任务和渲染任务将会在下一个时序当中由调用栈处理执行。
>
> 理解了这些，大家就会明白：如果调用栈 call stack 运行一个很耗时的脚本，比如解析一个图片，call stack 就会像北京上下班高峰期的环路入口一样，被这个复杂任务堵塞。主线程其他任务都要排队，进而阻塞 UI 响应。这时候用户点击、输入、页面动画等都没有了响应。
>
> 我们一般有两种方案突破上文提到的瓶颈：
>
> 1. 将耗时高、成本高、易阻塞的长任务切片，分成子任务，并异步执行
>
> 2. 另外一个创新性的做法：使用 HTML5 Web worker

## 性能检测

### 加载性能



### 检测平台

- https://jsperf.com/ | https://jsperf.com/popular
- https://github.com/web-perf
- https://github.com/mrdoob/stats.js

## 参考文献

- [HTML5 Techniques for Optimizing Mobile Performance](https://www.html5rocks.com/en/mobile/optimization-and-performance/)
- [网页性能管理详解](http://www.ruanyifeng.com/blog/2015/09/web-page-performance-in-depth.html)
- [干货|移动端H5前端性能优化](https://www.jianshu.com/p/0a65c3d03591)
- [移动端本地 H5 秒开方案探索与实现](https://segmentfault.com/a/1190000015250644)
- [指尖的流畅体验－－基于canvas建立移动界面](https://zhuanlan.zhihu.com/p/19967854)
- [也许，DOM 不是答案](http://www.ruanyifeng.com/blog/2015/02/future-of-dom.html)
- http://jankfree.org/
- [Radical Statements about the Mobile Web](https://jlongster.com/Radical-Statements-about-the-Mobile-Web)
- [为什么说DOM操作很慢](http://web.jobbole.com/84444/)
- [高频dom操作和页面性能优化探索](https://feclub.cn/post/content/dom)
- [既然用 virtual dom 可以提高性能，为什么浏览器不直接自带这个功能呢？](https://www.zhihu.com/question/67479886)
- [揭露DOM操作以及性能优化](https://blog.csdn.net/m0_38099607/article/details/72961066)
- [前端页面卡顿、也许是DOM操作惹的祸？](https://segmentfault.com/a/1190000009619572)
- [HTML5实现APP和原生方式有多大差距，多少坑？](https://www.zhihu.com/question/36158085)
- [Facebook: “Betting on HTML5 Was a Mistake” – Technical Reasons and Reactions](https://www.infoq.com/news/2012/09/Facebook-HTML5-Native)
- [HTML5要如何达到原生性能](http://gad.qq.com/article/detail/16889)
- [H5、React Native、Native应用对比分析](http://vczero.github.io/react_native/H5-React-Native-Native.html)
- [HTML5 性能之争 —— 单线程：缺点还是特点？](https://www.infoq.cn/article/2012%2F12%2Fhtml5-performance)

## 其他

- https://github.com/servo/servo
- https://github.com/dcloudio/mui

---

- 性能影响

    - [Impact of web latency on conversion rates](https://www.slideshare.net/bitcurrent/impact-of-web-latency-on-conversion-rates)

- 优化实践

    - [百度新首页性能优化](https://www.slideshare.net/welefen/ss-10734306)
    - [Web前端性能优化 2014](https://www.slideshare.net/leeight/web-2014?qid=5496cfb7-83c0-4ac9-ba66-fe369416a316&v=&b=&from_search=2)
    - [前端性能优化和自动化](https://www.slideshare.net/kavenyan/ss-2755539)
    - [前端性能测试](https://www.slideshare.net/tbmallf2e/ss-13071488)
    - [淘宝网前台应用性能优化实践](https://www.slideshare.net/jlusdy/ss-15485038)
    - [UC奇趣百科性能优化分享](https://www.slideshare.net/linx4200/uc-49535651)
    - [前端调试工具,编码相关,性能相关](https://www.slideshare.net/lijing00333/ss-7474025)
    - [SeaJS - 前端模块化开发探索与网站性能优化实践](https://www.slideshare.net/lifesinger/seajs-10500724)
    - [网站性能优化（周桂华）](https://www.slideshare.net/txppt/ss-25233098)
    - [如何解读页面性能？](https://www.slideshare.net/heavenhuang/ss-13068223)
    - [Css性能优化](https://www.slideshare.net/linxz/css-10230980)
    - [浅谈 Javascript 性能优化](https://www.slideshare.net/rainoxu/javascript-5464018)
    - [前端性能优化&测试](https://www.slideshare.net/tbmallf2e/ss-13071489)
    - [Web前端性能优化最佳实践](https://www.slideshare.net/Fonkie/web-21553879)
    - [好搜索性能优化与探索](https://www.slideshare.net/haozi1984/ss-55526890)
    - [Web前端性能优化 2014](https://www.slideshare.net/leeight/web-2014)
    - [网站前段性能优化-品友互动](https://www.slideshare.net/ShaoningPan/ss-11684297)
    - [构建高性能Html5网页游戏](https://www.slideshare.net/mysqlops/html5-8621336)
    - [网站性能优化](https://www.slideshare.net/bbayou/ss-8021188)
    - [移动的前端技术架构和性能优化](https://www.slideshare.net/fangdeng/ss-9233723)
    - [前瞻性Web性能优化pwpo](https://www.slideshare.net/ye.mikez/webpwpo)
    - [Web性能监控利器介绍](https://www.slideshare.net/xcgfly2sky/web-8813989)
    - [从 trim 原型函数看 JS 正则表达式的性能](http://fex.baidu.com/blog/2014/03/trim-to-regexp-performance/)
    - [前端工程与性能优化](http://fex.baidu.com/blog/2014/03/fis-optimize/)
    - [From Zero to Hero – Web Performance](https://www.slideshare.net/sspringer82/from-zero-to-hero-web-performance)
    - [Web performance](https://www.slideshare.net/islamzatary/web-performance-65353431)
    - [Web Performance: 3 Stages to Success](https://www.slideshare.net/AustinGil/web-performance-3-stages-to-success)
    - [Connecting Web Performance to Business Results Using mPulse](https://www.slideshare.net/Akamaidev/connecting-web-performance-to-business-results-using-mpulse)
    - [Webpack and Web Performance Optimization](https://www.slideshare.net/chentientsai/webpack-and-web-performance-optimization)
    - [WebPerformance: Why and How? – Stefan Wintermeyer](https://www.slideshare.net/Elixir-Meetup/webperformance-why-and-how-stefan-wintermeyer)
    - [Web Performance Matters: Challenges, Solutions, Best Practices](https://www.slideshare.net/cloudflare/web-performance-matters-challenges-solutions-best-practices)
    - [Web Performance - A Whistlestop Tour](https://www.slideshare.net/AndyDavies/web-performance-a-whistlestop-tour-10995825)
    - [Mobile App and Web Performance Testing](https://www.slideshare.net/dougsillars/mobile-app-and-web-performance-testing)
    - [2014 Ecommerce Page Speed & Web Performance](https://www.slideshare.net/Radware/radware-sotu-winter2014infographicwebperformance)
    - [Top 10 Trends in Web Performance & Monitoring](https://www.slideshare.net/SmartBear_Software/top-10-trends-in-web-performance-monitoring)
    - [Web Performance at First Glance](https://www.slideshare.net/GoAtlassian/web-performance-at-first-glance)
    - [Performance Is About People, Not Metrics [2017 Web Directions Summit]](https://www.slideshare.net/tammyeverts/performance-is-about-people-not-metrics-2017-web-directions-summit)
    - [Mobile Web Performance - Getting and Staying Fast](https://www.slideshare.net/AndyDavies/mobile-web-performance-getting-and-staying-fast)
    - [Mobile Web Performance Optimization Tips and Tricks](https://www.slideshare.net/blazeio/mobile-web-performance-optimization-tips-and-tricks)
    - [Top 10 Trends in Web Performance & Monitoring](https://www.slideshare.net/SmartBear_Software/top-10-trends-in-web-performance-monitoring)
    - [Web Performance & You](https://www.slideshare.net/dmolsenwvu/web-performance-you)
    - [Web performance testing](https://www.slideshare.net/patrickmeenan/web-performance-testing-9694040)
    - [Measuring Web Performance](https://www.slideshare.net/dmolsenwvu/measuring-web-performance-18921979)
    - [The Business Value of Web Performance](https://www.slideshare.net/tammyeverts/the-business-value-of-web-performance)
    - [Understanding HTTP & Web Performance](https://www.slideshare.net/fitc_slideshare/understanding-http-web-performance)
    - [Web performance at WDCNZ](https://www.slideshare.net/johnclegg/web-performance-at-wdcnz)
    - [Optimizing web performance (Fronteers edition)](https://www.slideshare.net/dmolsenwvu/optimizing-web-performance-fronteers-edition)
    - [Web performance 101](https://www.slideshare.net/sthair/web-performance-101-ldn-webperf-steve-thair)
    - [web-performance-optimizations](https://github.com/benjaminhoffman/web-performance-optimizations)
    - [Can You Afford It?: Real-world Web Performance Budgets](https://infrequently.org/2017/10/can-you-afford-it-real-world-web-performance-budgets/)
    - [移动H5前端性能优化指南 - 腾讯ISUX](https://cloud.tencent.com/developer/article/1154376)
    - [15年双11手淘前端技术巡演 - H5性能最佳实践](https://github.com/amfe/article/issues/21)
    - [提高 HTML5 画布性能](https://www.html5rocks.com/zh/tutorials/canvas/performance/)

---

- 加载性能
- JavaScript 性能
- CSS 性能

---

## TODO

### 网络优化

- [Network Issues Guide](https://developers.google.com/web/tools/chrome-devtools/network/issues)
