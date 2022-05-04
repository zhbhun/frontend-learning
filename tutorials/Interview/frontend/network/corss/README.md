CORS，Cross-Origin Resource Sharing。
========

## 同源策略

### 同源策略是什么？

> 同源策略限制了从同一个源加载的文档或脚本如何与来自另一个源的资源进行交互。这是一个用于隔离潜在恶意文件的重要安全机制。

### 怎样判断两个地址是否同源？

> 如果两个页面的协议，端口（如果有指定）和域名都相同，则两个页面具有相同的源。

PS：IE 的同源策略有两个不同点

1. > 授信范围（Trust Zones）：两个相互之间高度互信的域名，如公司域名（corporate domains），不遵守同源策略的限制。
2. > 端口：IE 未将端口号加入到同源策略的组成部分之中

Reference：

- [Same-origin policy for file: URIs](https://developer.mozilla.org/en-US/docs/Archive/Misc_top_level/Same-origin_policy_for_file:_URIs)

### 是否可以修改源？

> 脚本可以将 document.domain 的值设置为其当前域或其当前域的超级域。如果将其设置为其当前域的超级域，则较短的域将用于后续源检查。

### 跨源网络访问

原则

1. > 允许跨域写操作（Cross-origin writes）。例如链接（links），重定向以及表单提交。特定少数的HTTP请求需要添加 preflight。
2. > 允许跨域资源嵌入（Cross-origin embedding）。
3. > 不允许跨域读操作（Cross-origin reads）。但常可以通过内嵌资源来巧妙的进行读取访问。

示例

- > `<script src="..."></script>` 标签嵌入跨域脚本。语法错误信息只能在同源脚本中捕捉到。
- > `<link rel="stylesheet" href="...">` 标签嵌入CSS。由于CSS的松散的语法规则，CSS的跨域需要一个设置正确的Content-Type 消息头。不同浏览器有不同的限制： IE, Firefox, Chrome, Safari (跳至CVE-2010-0051)部分 和 Opera。
- > `<img>` 嵌入图片。支持的图片格式包括PNG,JPEG,GIF,BMP,SVG,...
- > `<video>` 和 `<audio>` 嵌入多媒体资源。
- > `<object>`, `<embed>` 和 `<applet>` 的插件。
- > @font-face 引入的字体。一些浏览器允许跨域字体（ cross-origin fonts），一些需要同源字体（same-origin fonts）。

    - [关于字体文件跨域访问限制的解决方法](https://vkyin.cn/font-cross-domain-solution/)
    - [Font fetching requirements](https://www.w3.org/TR/css-fonts-3/#font-fetching-requirements)
    - [CSS解惑-font-face引用字体跨域](https://github.com/sunmaobin/sunmaobin.github.io/issues/32)

- > `<frame>` 和 `<iframe>` 载入的任何资源。站点可以使用X-Frame-Options消息头来阻止这种形式的跨域交互。

如何阻止跨源访问

- > 阻止跨域写操作，只要检测请求中的一个不可测的标记(CSRF token)即可，这个标记被称为Cross-Site Request Forgery (CSRF) 标记。必须使用这个标记来阻止页面的跨站读操作。
- > 阻止资源的跨站读取，需要保证该资源是不可嵌入的。阻止嵌入行为是必须的，因为嵌入资源通常向其暴露信息。
- > 阻止跨站嵌入，需要确保你的资源不能是以上列出的可嵌入资源格式。多数情况下浏览器都不会遵守 Conten-Type 消息头。例如，如果您在HTML文档中指定 `<script>` 标记，则浏览器将尝试将HTML解析为JavaScript。 当您的资源不是您网站的入口点时，您还可以使用CSRF令牌来防止嵌入。

### 跨源脚本 API 访问

> Javascript的APIs中，如 iframe.contentWindow, window.parent, window.open 和 window.opener 允许文档间直接相互引用。当两个文档的源不同时，这些引用方式将对 Window 和 Location对象的访问添加限制。

允许以下对 Window 属性的跨源访问：

- window

    - 方法

        - window.blur
        - window.close
        - window.focus
        - [window.postMessage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage)：为了在不同源中文档进一步交流，可以使用window.postMessage。

    - 属性

        - window.closed： 只读；
        - window.frames： 只读；
        - window.length： 只读；
        - window.location： 读/写；
        - window.opener： 只读；
        - window.parent： 只读；
        - window.self： 只读；
        - window.top： 只读；
        - window.window： 只读；

- location

    - 方法

        - location.replace

    - 属性

        - URLUtils.href

### 跨源数据存储访问

> 存储在浏览器中的数据，如localStorage和IndexedDB，以源进行分割。每个源都拥有自己单独的存储空间，一个源中的Javascript脚本不能对属于其它源的数据进行读写操作。

> Cookies 使用不同的源定义方式。一个页面可以为本域和任何父域设置cookie，只要是父域不是公共后缀（public suffix）即可。Firefox 和 Chrome 使用 [Public Suffix List](https://publicsuffix.org/) 决定一个域是否是一个公共后缀（public suffix）。Internet Explorer使用其自己的内部方法来确定域是否是公共后缀。不管使用哪个协议（HTTP/HTTPS）或端口号，浏览器都允许给定的域以及其任何子域名(sub-domains) 访问 cookie。设置 cookie 时，你可以使用Domain，Path，Secure，和Http-Only标记来限定其访问性。读取 cookie 时，不会知晓它的出处。 即使您仅使用安全的https连接，您看到的任何cookie都可能使用不安全的连接进行设置。

### 参考文献

- [Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [Cross-Site Request Forgery (CSRF)](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_%28CSRF%29)


## 跨域解决方案

- [前端常见跨域解决方案（全）](https://www.cnblogs.com/roam/p/7520433.html)
- [enable cross-origin resource sharing](https://enable-cors.org/)
- [前端跨域整理](https://segmentfault.com/a/1190000007326671)

### CORS

- https://www.w3.org/TR/cors/
- [Using CORS](https://www.html5rocks.com/en/tutorials/cors/)
- [Understanding CORS](https://spring.io/understanding/CORS)
- [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [HTTP CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS)

---

- [前端跨域问题及解决方案](https://github.com/wengjq/Blog/issues/2)
