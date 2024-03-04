- [离线包实现详解](https://juejin.cn/post/7200552990737121337)


## 实现方案

- https://help.aliyun.com/document_detail/59594.html

### 加载本地路径

优点：简单可靠，无需 hook 和 调用私有API

缺点：有跨域问题，影响 cookie 和 localstorage，H5 需做少量改动

参考：

- [货拉拉H5离线包原理与实践](https://juejin.cn/post/7103348563479887885)

### 本地 Web Server

优点：兼容性好

缺点：对客户端耗电和 CPU 性能有影响

参考：

- [基于 LocalWebServer 实现 WKWebView 离线资源加载](https://juejin.cn/post/6844903492537024525)

### 请求拦截

优点：不修改加载 URL，没有跨域问题，且支持网页部分资源离线化，灵活性和兼容性好。

缺点：NSURLProtocol 拦截方案对 WKWebView 无效，但可以使用 WKURLSchemeHandler 来代替。

参考：

- [iOS离线包方案调研](https://juejin.cn/post/7285290243297919028)
- [WKWebView 请求拦截探索与实践](https://zhuanlan.zhihu.com/p/347592487)
- [一种使用 WKURLSchemeHandler 实现的 WKWebView 离线资源加载方案](https://zhuanlan.zhihu.com/p/56965133)

### Service Worker

优点：前端兼容性好

缺点：

- iOS端 WKWebView 不提供官方支持，实现技术难度大
- 对比离线包方案，缺少内置和预加载机制。

参考：

- [WKWebView离线化方案——实现Service Worker API](https://zhuanlan.zhihu.com/p/148931732)
- https://github.com/gdnmobilelab/SWWebView

