# Meta

- [Resource Hints: preload](https://caniuse.com/#feat=link-rel-preload)

## 请求头

### 缓存

HTTP 请求头

```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

HTML Meta

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

如果同时设置了 HTTP 请求头和 HTML Meta，那么 HTTP 请求头的优先级较高。

参考文献

- [How do we control web page caching, across all browsers?](https://stackoverflow.com/questions/49547/how-do-we-control-web-page-caching-across-all-browsers)
- [Using <meta> tags to turn off caching in all browsers? [duplicate]](https://stackoverflow.com/questions/1341089/using-meta-tags-to-turn-off-caching-in-all-browsers)
- [Disable browser caching with meta HTML tags](http://cristian.sulea.net/blog/disable-browser-caching-with-meta-html-tags/)
- [使用 HTML meta 标签来禁用缓存](https://blog.whe.me/post/prevent-caching.html)

## 移动端

- `viewport`：设置视口大小、缩放和安全区域适配
- `apple-mobile-web-app-capable`：设置是否全屏
- `apple-mobile-web-app-status-bar-style"`：状态栏样式
- `format-detection`：

    - `telephone=no`：禁止数字自动识别为电话号码
    - `email=no`：禁止 Email 识别

参考文献

- [iOS Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
