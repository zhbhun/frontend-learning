# WebAssembly

WebAssembly(wasm) 是一种低级的**类汇编语言**，具有紧凑的**二进制格式**，可以接近原生的性能运行，并为诸如 C/C++ 等语言提供一个编译目标，以便它们可以在 Web 上运行。

- 高效：体积小、加载快、执行快
- 安全：运行在一个沙箱话的执行环境中（严格遵守同源策略和浏览器安全策略）
- 开放：设计了一个非常规整的文本格式（wabt），各种后端语言都可以以其作为编译目标
- 标准：无版本、特性可检测、向后兼容

相关资源

- [WebAssembly 官网](http://webassembly.org) / [WebAssembly 中文网](http://webassembly.org.cn/)
- [awesome-wasm](https://github.com/mbasso/awesome-wasm)
- [WebAssembly完全入门——了解wasm的前世今身](https://segmentfault.com/a/1190000016949129)
- [WebAssembly Modules in Rust: An Introduction](https://medium.com/@rossbulat/webassembly-modules-an-introduction-5554b8982402)

## 框架

### Blazor

- [Blazor](https://dotnet.microsoft.com/apps/aspnet/web-apps/client)
- [Document](https://docs.microsoft.com/en-us/aspnet/core/blazor/?view=aspnetcore-3.0)
- [如何评价Blazor？](https://www.zhihu.com/question/267427441/answer/327778049)
- [Blazor 将.NET 带回到浏览器](https://www.infoq.cn/article/2017/07/Blazor)
- [Blazor 正式成为 Microsoft 官方.NET 和 WebAssembly 项目](https://www.infoq.cn/article/2018/02/blazor-webassembly-microsoft)

衍生

- [Bolero](https://github.com/fsbolero/Bolero)
- [Ooui](https://github.com/praeclarum/Ooui)

## 应用

### 超声波传输数据

- [quiet/quiet-js](https://github.com/quiet/quiet-js/)
- [Ultrasonic payments](https://charliegerard.dev/blog/ultrasonic-payments/)

## 参考文献

- [​2019 年 WebAssembly 盘点：跟 Javascript 的相爱相杀](https://mp.weixin.qq.com/s/C6Zhs0mMs9oAJN889pG6rQ)

---

TODO

- [[译] WebAssembly: How and why](https://zhuanlan.zhihu.com/p/47097165)
- [WebAssembly 现状与实战](https://developer.ibm.com/zh/technologies/web-development/articles/wa-lo-webassembly-status-and-reality/)
- [如何使用WebAssembly提升性能](https://www.infoq.cn/article/2IHWa2Ivbvw*hFw6fvk6?utm_source=related_read_bottom&utm_medium=article)
- [如何使用 WebAssembly 和 JS 构建高性能应用程序](https://www.infoq.cn/article/PNaHYQS3ivugtLTqD8sv?utm_source=related_read_bottom&utm_medium=article)
- [漫画详解：WebAssembly与所有语言的互操作！](https://www.infoq.cn/article/bc0fzghd9s6fmm03pmbi)
- [eBay实战WebAssembly：50倍性能提升](https://juejin.cn/post/6844903854258012173)
- [纵论WebAssembly,JS在性能逆境下召唤强援](https://www.cnblogs.com/penghuwan/p/11982601.html#_label8)
- [一个白学家眼里的 WebAssembly](https://zhuanlan.zhihu.com/p/102692865)
- [WebAssembly-JS在性能逆境下召唤强援](https://zhuanlan.zhihu.com/p/95175051)
- [20分钟上手 webAssembly](https://juejin.cn/post/6844903661982728200)
- [WebAssembly如何演进成为“浏览器第二编程语言”？](https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247499196&idx=1&sn=a5143d38aa10bc3be2ba7cd80d736fc5&chksm=f95248ffce25c1e9925f614b65ae0008d909d2ec1b40b557f1410df5ee8524fe9554e386ad7f&scene=21#wechat_redirect)
- [快速上手 WebAssembly 应用开发：Emscripten 使用入门](https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247500642&idx=2&sn=5cd9ef85ec21d0f126c36c6cff5784fb&chksm=f9527621ce25ff3789a8c5c7b73efcb760a61362ef15778e218f2f787b18454e320165e04dae&scene=21#wechat_redirect)
- [从0开始快速上手WebAssembly：打造基于WASM的高性能安全沙盒](https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247503499&idx=2&sn=bd4e7a4d556309d5526f32fa83c3d3d5)
- [WebAssembly多线程支持的内部原理](https://www.infoq.cn/article/B6eT0jQt1zg*xbqjMgDq)
