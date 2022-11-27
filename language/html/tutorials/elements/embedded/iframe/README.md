# [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)

## 教程

### 优缺点

**iframe 的优点**

- 解决加载缓慢的第三方内容如图标和广告等的加载问题
- Security sandbox
- 并行加载脚本

**iframe 的缺点**

- iframe 会阻塞主页面的 onload 事件；
- 搜索引擎的检索程序无法解读这种页面，不利于 SEO；
- iframe 和主页面共享连接池，而浏览器对相同域的连接有限制，所以会影响页面的并行加载；

**iframe 使用要点**

如果需要使用 iframe，最好是通过 javascript 动态给 iframe 添加 src 属性值。

### src & srcdoc

...

### [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)

- deny
- sameorigin
- allow-from=url

参考文献

- [X-Frame-Options](https://cloud.tencent.com/developer/section/1190032)

### sandox

...

### referrerpolicy

...

## 参考文献

- [嵌入的iframe又不能访问了？还有这些你不知道的事](https://juejin.cn/post/6991828558096105485)
- [The ultimate guide to iframes](https://blog.logrocket.com/the-ultimate-guide-to-iframes/)
