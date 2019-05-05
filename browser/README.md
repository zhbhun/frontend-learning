浏览器
========

- [浏览器渲染流水线解析（一）](https://yq.aliyun.com/articles/304648)
- [浏览器渲染流水线解析（二）](https://yq.aliyun.com/articles/304650)
- [浏览器渲染流水线解析（三）](https://yq.aliyun.com/articles/304651)
- [浏览器渲染流水线解析（四）](https://yq.aliyun.com/articles/304652)
- [Chrome 渲染流水线演化的未来](https://juejin.im/post/5aa7671d518825558a064880)
- [前端性能优化之浏览器渲染优化 —— 打造60FPS页面](https://github.com/fi3ework/Blog/issues/9)
- [浏览器渲染流水线解析与网页动画性能优化](https://yq.aliyun.com/articles/304655?spm=5176.100244.teamhomeleft.1.ZfAxFL)

---

# 常见问题
1. 介绍一下你对浏览器内核的理解？

    > 主要分成两部分：渲染引擎(layout engineer 或 Rendering Engine)和 JS 引擎。
    >
    > 渲染引擎：负责取得网页的内容（HTML、XML、图像等等）、整理讯息（例如加入CSS等），以及计算网页的显示方式，然后会输出至显示器或打印机。浏览器的内核的不同对于网页的语法解释会有不同，所以渲染的效果也不相同。所有网页浏览器、电子邮件客户端以及其它需要编辑、显示网络内容的应用程序都需要内核。
    >
    > JS引擎：解析和执行javascript来实现网页的动态效果。
    >
    > 最开始渲染引擎和JS引擎并没有区分的很明确，后来JS引擎越来越独立，内核就倾向于只指渲染引擎。

2. 常见的浏览器内核有哪些？

    > - Trident内核：IE,MaxThon,TT,The World,360,搜狗浏览器等。[又称MSHTML]
    > - Gecko内核：Netscape6及以上版本，FF,MozillaSuite/SeaMonkey等
    > - Presto内核：Opera7及以上。      [Opera内核原为：Presto，现为：Blink;]
    > - Webkit内核：Safari,Chrome等。   [ Chrome的：Blink（WebKit的分支）]

# 参考文献

- [浏览器内核的解析和对比](http://www.cnblogs.com/fullhouse/archive/2011/12/19/2293455.html)
- [各主流浏览器内核介绍](http://www.cnblogs.com/vajoy/p/3735553.html)

---

- [Cheat-Sheet：自定义浏览器资源调度行为的几种方式](https://twitter.com/addyosmani/status/743571393174872064)
- [Record first paint of a webpage (from appmetrics.js)](http://gitlab.meiyou.com/snippets/3)
