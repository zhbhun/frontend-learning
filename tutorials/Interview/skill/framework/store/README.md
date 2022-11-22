## Cookie VS localStorage VS sessionStorage

- [详说 Cookie, LocalStorage 与 SessionStorage](http://jerryzou.com/posts/cookie-and-web-storage/)

| | cookie | localStorage | sessionStorage |
| --- | --- | --- | --- |
| 由谁初始化 | 客户端或服务器，服务器可以使用Set-Cookie请求头。 | 客户端 | 客户端 |
| 过期时间 | 手动设置 | 永不过期 | 当前页面关闭时 |
| 在当前浏览器会话（browser sessions）中是否保持不变 | 取决于是否设置了过期时间 | 是 | 否 |
| 是否随着每个 HTTP 请求发送给服务器 | 是，Cookies 会通过Cookie请求头，自动发送给服务器	| 否 | 否 |
| 容量（每个域名） | 4kb | 5MB | 5MB |
| 访问权限 | 任意窗口 | 任意窗口 | 当前页面窗口 |

## HTTP Cache VS H5 App Cache VS Service Worker

- [浏览器缓存、CacheStorage、Web Worker 与 Service Worker](https://github.com/youngwind/blog/issues/113)
- [Web Cache， H5 AppCache， SW Cache 三者的浅析和比较](http://aoyouzi.iteye.com/blog/2284682)
- [借助Service Worker和cacheStorage缓存及离线开发](http://www.zhangxinxu.com/wordpress/2017/07/service-worker-cachestorage-offline-develop/)
- [浏览器的缓存机制](http://coderlt.coding.me/2016/11/21/web-cache/)
- [http协商缓存VS强缓存](http://www.cnblogs.com/wonyun/p/5524617.html)
- [为什么app cache没有得到大规模应用？它有哪些硬伤吗？](https://www.zhihu.com/question/29876535)
- [Application Cache is a Douchebag](https://alistapart.com/article/application-cache-is-a-douchebag)
