# 存储

## 常见问题

### 存储空间限制大小？

- [What is the max size of localStorage values?](https://stackoverflow.com/questions/2989284/what-is-the-max-size-of-localstorage-values)
- [chrome cookie size limit](https://stackoverflow.com/questions/2543851/chrome-cookie-size-limit)
- [Using JavaScript to fill localStorage to its maximum capacity](https://mmazzarolo.com/blog/2022-06-26-filling-local-storage-programmatically/)
- [Using JavaScript to fill localStorage to its maximum capacity](https://mmazzarolo.com/blog/2022-06-26-filling-local-storage-programmatically/)

---

- [Store.js](https://github.com/marcuswestin/store.js)

# 常见问题
1. 有哪些存储方式？

    - cookie
    - usedata
    - sessionStorage
    - globalStorage
    - localStorage

2. Cookie VS Storage？

    - 作用不同

        - cookie 是网站为了标示用户身份而储存在用户本地终端上的数据，在与服务器进行交互时，随着 HTTP 请求一起发送给同域的服务器；
        - storage 是为了在本地存储数据而生的；

    - 存储大小不同

        - cookie 数据大小不能超过 4k；
        - sessionStorage 和 localStorage 虽然也有存储大小的限制，但比 Cookie 大得多，可以达到 5M 或更大；

    - 有效期不同

        - cookie 在设置的过期时间之前一直有效，即使窗口或浏览器关闭；
        - localStorage 存储持久数据，浏览器关闭后数据不丢失除非主动删除数据；
        - sessionStorage 数据在当前浏览器窗口关闭后自动删除；

    - 兼容性不同

        除了 IE7 及以下版本外，都支持 Web Storage，IE7、IE6 的本地存储解决方案是 userData，可以自行封装统一的 Web Storage。

3. Cookie 的弊端

    1. 每个特定的域名下最多生成 20 个 cookie；

        - IE6 或更低版本最多 20 个 cookie；
        - IE7 和之后的版本最后可以有 50 个 cookie；
        - Firefox 最多 50 个 cookie；
        - chrome 和 Safari 没有做硬性限制；

    2. IE 和 Opera 会清理近期最少使用的 cookie， Firefox 会随机清理 cookie；
    3. cookie 的最大大约为 4096 字节，为了兼容性，一般不能超过 4095 字节；

4. Cookie 使用经验

    1. 控制 cookie 的生命期，避免使用不会失效的 cookie；
    2. 只在 cookie 中存放不敏感数据；
    3. 通过加密和安全传输技术（SSL），减少 cookie 被破解的可能性；

---

- [AppCache](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Using_the_application_cache)
- https://stackoverflow.com/questions/2989284/what-is-the-max-size-of-localstorage-values
- https://www.html5rocks.com/en/tutorials/offline/quota-research/
- https://arty.name/localstorage.html
- https://www.html5rocks.com/en/tutorials/offline/quota-research/
- [新一代的前端存储方案--indexedDB](https://juejin.im/post/5b09a641f265da0dcd0b674f)
- [深入了解浏览器存储：对比Cookie、LocalStorage、sessionStorage与IndexedDB](https://yq.aliyun.com/articles/697120)
