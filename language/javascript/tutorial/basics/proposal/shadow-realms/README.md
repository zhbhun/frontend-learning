- [tc39/proposal-shadowrealm: ECMAScript Proposal, specs, and reference implementation for Realms (github.com)](https://github.com/tc39/proposal-shadowrealm)
- [(39 封私信 / 80 条消息) 如何评价 ECMAScript 的 ShadowRealm API 提案？ - 知乎 (zhihu.com)](https://www.zhihu.com/question/507404363/answer/2282856031)
- [Javascript 新特性前瞻 —— ShadowRealms - 掘金 (juejin.cn)](https://juejin.cn/post/7089822133559230501)

## 应用场景

- 在 Web IDE 或 Web 绘图应用等程序中运行插件等第三方代码。
- 在 ShadowRealms 中创建一个编程环境，运行用户代码。
- 服务器可以在 ShadowRealms 中运行第三方代码。
- 在 ShadowRealms 中可以运行测试，这样外部的JS执行环境不会受到影响，并且每个套件都可以在新环境中启动(这有助于提高可复用性)。
- 网页抓取(从网页中提取数据)和网页应用测试等可以在 ShadowRealms 中运行。