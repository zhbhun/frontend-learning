AJAX
========

## 历史

- IE5 第一次引入 XHR 对象；
- 2005 年，Jesse James Garrett 发表了 [《Ajax：A New Approach To Web Application》](http://adaptivepath.org/ideas/ajax-new-approach-web-applications/)；
- XMLHttpRequest 1；鉴于 XHR 已经得到了广泛的接受，成为了事实标准，W3C 着手制定了相应的标准以规范其行为（只是把已有的 XHR 对象的实现细节描述了出来）；
- XMLHttpRequest 2；进一步扩展了 XHR（并不是所有浏览器都完整实现了 XMLHttpRequest 2 级规范）；

## 用法

### 创建实例

- IE7+、Firefox、Chrome 和 Safari

    `var xhr = new XMLHttpRequest();`

- IE7 之前的版本

    ```javascript
    function createXHR() {
      if (typeof XMLHttpRequest != 'undefined') {
        return new XMLHttpRequest();
      } else if (typeof ActiveXObject != 'undefined') {
        if (typeof arguments.calle.activeXString != 'string') {
          var versions = ['MSXML2.XMLHttp.6.0', 'MSXML2.XMLHttp.3.0', 'MSXML2.XMLHttp'], i , len;
          for (i = 0, len = versions.lengths; i < len; i ++) {
            try {
              new ActiveXObject(versions[i]);
              arguments.callee.activeXString = versions[i];
            } catch (ex) {
              //
            }
          }
        }
        return new ActiveXObject(arguments.callee.activeXString);
      } else {
        throw new Error('NO XHR object available.');
      }
    }
    ```

### 发送请求
```javascript
var xhr = new XMLHttpRequest();
xhr.onreadystatechange = function () { // 为了确保跨浏览器兼容性，该方法必须在调用 `open()` 方法之前指定
  if (xhr.readyState == 0) { // 未初始化（未调用 open 方法）
  if (xhr.readyState == 1) { // 启动（已调用 open 方法，但未调用 send 方法）
  } else if (xhr.readyState == 2) { // 发送（已调用 send 方法，但未接收到响应）
  } else if (xhr.readySatte == 3) { // 接收（已接收到部分响应数据）
  } else if (xhr.readyState == 4) { // 完成（已接收到全部响应数据）
    // xhr.status 响应的 HTTP 状态
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) { // 有的浏览器会错误的报告 204 状态码
      // xhr.responseText 作为响应主体被返回的文本
      // xhr.responseXML 作为响应主体被返回的 XML DOM 文档（在响应的内容类型是 "text/html" 或 "application/xml" 时才有值，否则为 null）
    } else {
      // xhr.statusText HTTP 状态的说明（不同浏览器的说明可能不一致）
    }
  }
};
xhr.open(method: string, url: string, async: bool); // 请求方法，请求地址，是否异步
xhr.send(object); // 这个参数对于有些浏览器是必须的，如果不需要通过请求主体发送数据，则必须传入 `null`。
```

### 取消请求
在执行 `xhr.abort()` 后，XHR 对象会停止触发事件，而且也不再允许访问任何与响应有关的对象属性。在终止请求后，还应对 XHR 对象进行解除引用操作。由于内存的原因，不建议重用 XHR 对象。

### 请求头和响应头
- `xhr.setRequestHead(name: string, value: string)`：必须在调用 `open()` 方法之后且调用 `send()` 方法之前调用该方法；

    虽然不同的浏览器实际发送的头部信息有所不用，但是下列请求头基本上是所有浏览器都会发送的：

    - `Accept`：浏览器能够处理的内容类型
    - `Accept-Charset`：浏览器能够显示的字符集
    - `Accept-Encoding`：浏览器能够处理的压缩编码
    - `Accept-Language`：浏览器当前设置的语言
    - `Connection`：浏览器与服务器之间的连接类型
    - `Cookie`：当前页面设置的任何 Cookie
    - `Host`：发出请求的页面所在的域
    - `Referer`：发出请求的页面的 URI
    - `User-Agent`：浏览器的用户代理字符串

- `xhr.getResponseHeader(name: string)`
- `xhr.getAllResponseHeaders()`

### GET 请求
GET 请求常用于向服务器查询某些信息。GET 请求可以将查询参数追加到 URL 的末尾，但要注意查询字符串必须经过正确的编码才行。

```javascript
function addURLParam(url, name, value) {
  url += url.indexOf('?') == -1 ? '?' : '&';
  url += encodeURIComponent(name) + '=' + encodeURIComponent(value);
  return url;
}
```

### POST 请求
POST 请求常用于向服务器发送应该被保存的数据。POST 请求把数据作为请求的主体提交，可以包含非常多的数据且格式不限。

- 提交表单数据

    ```javascript
    var xhr = XMLHttpRequest();
    xhr.onreadystatechange = fucntion () { ... };
    xhr.open('post', url: string, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.sed(params: string); // 同 GET 请求的查询字符串格式
    ```

- 提交 JSON 数据

    ```javascript
    var xhr = XMLHttpRequest();
    xhr.onreadystatechange = fucntion () { ... };
    xhr.open('post', url: string, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.sed(params: string); // JSON 对象序列化字符串
    ```

### XMLHttpRequest 2
- timeout

    - 用法：给 XHR 对象设置 timeout 属性，表示请求在等待响应多少毫秒之后就终止（调用 ontimeout 事件处理程序）

        ```javascript
        var xhr = XMLHttpRequest();
        xhr.timeout = 10000; // 10 秒
        xhr.ontimeout = function () { ... };
        xhr.onreadystatechange = fucntion () { ... };
        xhr.open('post', url: string, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.sed(params: string); // JSON 对象序列化结果
        ```

    - 注意点：超时后可能还是会执行 `onreadystatechange` 方法且 `readyState` 值为 4
    - 兼容性：IE8+

    - [AJAX (XmlHttpRequest) timeout length by browser](https://stackoverflow.com/questions/9502410/ajax-xmlhttprequest-timeout-length-by-browser)

- overrideMimeType
- FormData

    - 用法

        ```javascript
        var xhr = XMLHttpRequest();
        xhr.onreadystatechange = fucntion () { ... };
        xhr.open('post', url: string, true);
        var form = document.getElementsByTagName('form')[0];
        xhr.sed(new FormData(form));
        ```

    - 优点：为序列化表单以及创建表单格式相同的数据提供了便利，并且不必明确的在 XHR 对象上设置请求头部
    - 兼容性：Firefox 4+，Safari 5+，Chrome 和 Android 3+

## 跨域

- [浏览器的同源策略](https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy)
- [JavaScript跨域总结与解决办法](http://www.cnblogs.com/rainman/archive/2011/02/20/1959325.html)
- [How to enable cross-domain request on the server?](https://stackoverflow.com/questions/6871021/how-to-enable-cross-domain-request-on-the-server)
- [Access-Control-Allow-Origin: Dealing with CORS Errors in Angular](https://daveceddia.com/access-control-allow-origin-cors-errors-in-angular/)
- [jQuery Ajax from child domain](https://stackoverflow.com/questions/5079212/jquery-ajax-from-child-domain)
- [浏览器为什么选择了如今的同源策略](https://v2ex.com/t/843069)

## 参考文献

- [规范](https://xhr.spec.whatwg.org/)
- [XMLHttpRequest API](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest)
- [FormData API](https://developer.mozilla.org/zh-CN/docs/Web/API/FormData)
- [Using XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest)
- [Using the XML HTTP Request object](http://jibbering.com/2002/4/httprequest.html)
- [XMLHttpRequest, REST and the Rich User Experience](http://www.peej.co.uk/articles/rich-user-experience.html)
- [New Tricks in XMLHttpRequest2](https://www.html5rocks.com/en/tutorials/file/xhr2/)

## 实现

- https://github.com/topics/ajax
- [fetch](https://github.com/github/fetch)
- [unfetch](https://github.com/developit/unfetch)
- [node-fetch](https://github.com/bitinn/node-fetch)
- [cross-fetch](https://github.com/lquixada/cross-fetch)
- [axios](https://github.com/axios/axios)
- [reqwest](https://github.com/ded/reqwest)
- [superagent](https://github.com/visionmedia/superagent)
- [request](https://github.com/request/request)
- [unfetch](https://github.com/developit/unfetch)

### 对比

- fetch

    - 优点：浏览器原生支持
    - 缺点：

        - 存在兼容性问题
        - 默认不携带 Cookie
        - 对某些错误的 HTTP 状态不会 reject
        - 不支持 progress 事件
        - 不支持超时处理
        - 不支持 JSONP

- axios

参考文献

- [fetch使用的常见问题及解决办法](https://www.cnblogs.com/huilixieqi/p/6494380.html)
- [fetch 没有你想象的那么美](http://undefinedblog.com/window-fetch-is-not-as-good-as-you-imagined)
- [Fetch vs. Axios.js for making http requests](https://medium.com/@thejasonfile/fetch-vs-axios-js-for-making-http-requests-2b261cdd3af5)
- [What is difference between Axios and Fetch?](https://stackoverflow.com/questions/40844297/what-is-difference-between-axios-and-fetch)

### fetch

取消请求

- ~~[Aborting a fetch ](https://github.com/whatwg/fetch/issues/27)~~
- ~~[How do I cancel an HTTP fetch() request?](https://stackoverflow.com/questions/31061838/how-do-i-cancel-an-http-fetch-request)~~
- ~~[Fetch不能中断的话 那如何在组件移除之前 移除掉这个异步请求？](http://react-china.org/t/fetch/7482)~~
- [Abortable fetch](https://developers.google.com/web/updates/2017/09/abortable-fetch)
- [AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)

### 相关资源

- [传统 Ajax 已死，Fetch 永生](https://segmentfault.com/a/1190000003810652)

## 问题

- [Can I use XMLHttpRequest on a different port from a script file loaded from that port?](https://stackoverflow.com/questions/1767443/can-i-use-xmlhttprequest-on-a-different-port-from-a-script-file-loaded-from-that)
- [Not able to set HTTP Host header on $.ajax request](https://stackoverflow.com/questions/8865896/not-able-to-set-http-host-header-on-ajax-request)
