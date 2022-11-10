# AJAX

## 历史

- IE5 第一次引入 XHR 对象；
- 2005 年，Jesse James Garrett 发表了 [《Ajax：A New Approach To Web Application》](http://adaptivepath.org/ideas/ajax-new-approach-web-applications/)；
- XMLHttpRequest 1；鉴于 XHR 已经得到了广泛的接受，成为了事实标准，W3C 着手制定了相应的标准以规范其行为（只是把已有的 XHR 对象的实现细节描述了出来）；
- XMLHttpRequest 2；进一步扩展了 XHR（并不是所有浏览器都完整实现了 XMLHttpRequest 2 级规范）；

## 基础

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

#### GET 请求

GET 请求常用于向服务器查询某些信息。GET 请求可以将查询参数追加到 URL 的末尾，但要注意查询字符串必须经过正确的编码才行。

```javascript
function addURLParam(url, name, value) {
  url += url.indexOf('?') == -1 ? '?' : '&';
  url += encodeURIComponent(name) + '=' + encodeURIComponent(value);
  return url;
}
```

#### POST 请求

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

#### 设置请求头

`xhr.setRequestHead(name: string, value: string)` 必须在调用 `open()` 方法之后且调用 `send()` 方法之前调用该方法。虽然不同的浏览器实际发送的头部信息有所不用，但是下列请求头基本上是所有浏览器都会发送的：

- `Accept`：浏览器能够处理的内容类型

    `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9`

- `Accept-Encoding`：浏览器能够处理的压缩编码

    `gzip, deflate, br`

- `Accept-Language`：浏览器当前设置的语言

    `zh`

- `Connection`：浏览器与服务器之间的连接类型

    `keep-alive`

- `Host`：发出请求的页面所在的域

    `www.baidu.com`

- `Referer`：发出请求的页面的 URI
- `Cookie`：当前页面设置的任何 Cookie
- `User-Agent`：浏览器的用户代理字符串

    `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36`

参考[《Forbidden header name》](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name)，可以查看哪些请求头不能设置。

- Accept-Charset
- Accept-Encoding
- Connection
- Content-Length
- Cookie
- Host
- User-Agent：早期被限制，新的标准允许修改，但是 Chrome 仍然不支持

#### 设置 MIME 类型

XMLHttpRequest 的 overrideMimeType 方法是指定一个MIME类型用于替代服务器指定的类型，使服务端响应信息中传输的数据按照该指定MIME类型处理。例如强制使流方式处理为"text/xml"类型处理时会被使用到，即使服务器在响应头中并没有这样指定。此方法必须在send方法之前调用方为有效。

```js
XMLHttpRequest.overrideMimeType(mimeType)
```

#### 设置 responseType

XMLHttpRequest 属性 responseType 是一个枚举字符串值，用于指定响应中包含的数据类型。

- `""`：空的 responseType 字符串与默认类型 "text" 相同。
- `"arraybuffer"`：response 是一个包含二进制数据的 JavaScript ArrayBuffer。
- `"blob"`：response 是一个包含二进制数据的 Blob 对象。
- `"document"`：response 是一个 HTML Document 或 XML XMLDocument，根据接收到的数据的 MIME 类型而定。
- `"json"`：response 是通过将接收到的数据内容解析为 JSON 而创建的 JavaScript 对象。
- `"text"`：response 是 DOMString 对象中的文本。

ps：responseType 要在调用 open() 初始化请求之后调用，并且要在调用 send() 发送请求到服务器之前调用。

#### 携带凭证信息

`XMLHttpRequest.withCredentials` 属性是一个 Boolean 类型的属性，用于控制是否该使用类似 cookies，authorization headers(头部授权)或者 TLS 客户端证书这一类资格证书来创建一个跨站点访问控制请求。

ps：在同域请求中，该配置无效。

#### 查询上传进度

`XMLHttpRequest.upload` 属性返回一个 XMLHttpRequestUpload对象，用来表示上传的进度。

ps：这个对象是不透明的，需要通过对其绑定事件来追踪它的进度。

### 监听事件

- loadstart：当程序开始加载时，loadstart 事件将被触发。
- progress：progress事件会在请求接收到数据的时候被周期性触发。
- load：当一个XMLHttpRequest请求完成的时候会触发load 事件。
- loadend：loadend 事件总是在一个资源的加载进度停止之后被触发 (例如，在已经触发“error”，“abort”或“load”事件之后)。
- abort：取消请求。
- error：当请求遇到错误时，将触发error 事件。
- timeout：当进度由于预定时间到期而终止时，会触发timeout 事件。
- readystatechange：只要 readyState 属性发生变化，就会调用相应的处理函数。

    ps：当一个 XMLHttpRequest 请求被 abort() 方法取消时，其对应的 readystatechange 事件不会被触发。

#### 请求超时

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

### 响应处理

#### 获取响应状态

- `XMLHttpRequest.status`：在请求完成前，statu s的值为 0。、如果 XMLHttpRequest 出错，浏览器返回的 status 也为 0。
- `XMLHttpRequest.statusText`：返回状态对应的文本信息，例如"OK"或是"Not Found"。

#### 获取响应数据

- `XMLHttpRequest.response`：返回的类型为 ArrayBuffer 、 Blob 、 Document 、 JavaScript Object 或 DOMString 中的一个。 这取决于 responseType 属性。
- `XMLHttpRequest.responseText`：在一个请求被发送后，从服务器端返回文本。

    PS：当 responseText 为 null 时，表示请求失败了。当 responseText 为""时，表示这个请求还没有被 send()。当处理一个异步 request 的时候，尽管当前请求并没有结束，responseText 的返回值是当前从后端收到的内容。

- `XMLHttpRequest.responseXML`：返回一个包含请求检索的HTML或XML的Document，如果请求未成功，尚未发送，或者检索的数据无法正确解析为 XML 或 HTML，则为 null。

#### 获取响应头

- `xhr.getResponseHeader(name: string)`
- `xhr.getAllResponseHeaders()`

#### 获取响应地址

`XMLHttpRequest.responseURL` 一般等于 `XMLHttpRequest.open()` 的 URL 传参，但是如果 URL 有锚点，则位于URL # 后面的内容会被删除。如果URL有重定向， responseURL 的值会是经过多次重定向后的最终 URL 。

### 取消请求

在执行 `xhr.abort()` 后，XHR 对象会停止触发事件，而且也不再允许访问任何与响应有关的对象属性。在终止请求后，还应对 XHR 对象进行解除引用操作。由于内存的原因，不建议重用 XHR 对象。

```js
var xhr = XMLHttpRequest();
xhr.onabort = function (event) {};
xhr.addEventListener('abort', function (event) {});
xhr.open('get', url, true);
xhr.sed(params);
setTimout(function () {
  xhr.abort();
}, 0);
```

取消请求的应用场景

- 重复请求：重复点击
- 竞态请求：并发请求
- 无效请求：页面销毁

参考文献:

- [前端如何中断请求](https://zhuanlan.zhihu.com/p/460014212)

## 进阶

### XMLHttpRequest VS fetch

| 特性\技术 | XMLHttpRequest | fetch |
| --- | --- | --- |
| 兼容性 | 支持 | Chrome ^39、Firefox ^42、Safari ^10.1、iOS_Safari ^10.3 |
| Promise | 不支持 | 支持 |
| 上传进度 | 支持 | 不支持 |
| 设置超时 | 支持 | 不支持 |
| 取消请求 | 支持 | 支持：Chrome ^66、Firefox ^57、Safari ^11.1、iOS_Safari ^11.3 |
| 数据流分块读取 | 不支持 | 支持 |
| 重定向模式 | 不支持 | 支持 |
| 缓存模式 | 不支持 | 支持 |
| 跨域模式 | 不支持 | 支持 |
| referrer 策略 | 不支持 | 支持 |
| integrity | 不支持 | 支持 |
| keepalive | 不支持 | 支持 |

TODO: 调研 fetch 的兼容性处理

### 封装库

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

### 跨域解决方案

- [JavaScript跨域总结与解决办法](http://www.cnblogs.com/rainman/archive/2011/02/20/1959325.html)
- [浏览器为什么选择了如今的同源策略](https://v2ex.com/t/843069)

### 表单跨域

- [为什么form表单提交没有跨域问题，但ajax提交有跨域问题？](https://www.zhihu.com/question/31592553)
- [表单可以跨域吗](https://github.com/frontend9/fe9-interview/issues/1)

### [CORS（跨域资源共享）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)

CORS 是一个 W3C 标准，全称是"跨域资源共享"，它允许浏览器向跨源服务器，发出 XMLHttpRequest 请求，从而克服了 AJAX 只能同源使用的限制。

浏览器将 CORS 请求分成两类：简单请求（simple request）和非简单请求（not-so-simple request），非简单请求的 CORS 请求，会在正式通信之前，增加一次 HTTP 查询请求，称为"预检"请求（preflight）。

ps：简单请求时为了兼容表单，因为历史上表单一直可以发出跨域请求。AJAX 的跨域设计就是，只要表单可以发，AJAX 就可以直接发，但 AJAX 是否可以取得响应值，就得看 CORS 响应头的设置了。

参考文献

- [跨域资源共享 CORS 详解](https://www.ruanyifeng.com/blog/2016/04/cors.html)

#### 简单请求

满足条件：

- 请求方法是 HEAD、GET 或 POST；
- 请求头不超出以下几种字段：Accept、Accept-Language、Content-Language、Last-Event-ID，Content-Type 只限于三个值 application/x-www-form-urlencoded、multipart/form-data、text/plain。

工作流程：

1. AJAX 发起简单跨域请求；
2. 浏览器自动在请求头里增加一个 Origin 字段（表示当前网页所在的域名地址：协议 + 域名 + 端口）；
3. 服务器校验 Origin 制定的源是否在许可范围内；

    - 不在许可范围内：服务器会返回一个正常的 HTTP 回应，浏览器发现回应的头信息没有包含 `Access-Control-Allow-Origin`，会抛出一个错误；
    - 在许可范围内：服务器返回的响应会设置响应头 `Access-Control-Allow-Origin`，对应的值可以是 Origin 的值，也可以是 *，表示接受任意域名的请求；

#### 非简单请求

工作流程：

1. AJAX 发起非简单请求；
2. 浏览器会在正式通信之前，增加一次 HTTP 查询请求，称为"预检"请求询问服务器，当前网页所在的域名是否在服务器的许可名单之中，以及可以使用哪些 HTTP 动词和头信息字段，只有得到肯定答复，浏览器才会发出正式的 AJAX 请求，否则就报错；

    跨域请求：

    ```
    var url = 'http://api.alice.com/cors';
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('X-Custom-Header', 'value');
    xhr.send();
    ```

    预检请求：

    ```
    OPTIONS /cors HTTP/1.1
    Origin: http://api.bob.com
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: X-Custom-Header
    Host: api.alice.com
    Accept-Language: en-US
    Connection: keep-alive
    User-Agent: Mozilla/5.0...
    ```

    预检响应：

    ```
    HTTP/1.1 200 OK
    Date: Mon, 01 Dec 2008 01:15:39 GMT
    Server: Apache/2.0.61 (Unix)
    Access-Control-Allow-Origin: http://api.bob.com
    Access-Control-Allow-Methods: GET, POST, PUT
    Access-Control-Allow-Headers: X-Custom-Header
    Access-Control-Max-Age: 1728000
    Content-Type: text/html; charset=utf-8
    Content-Encoding: gzip
    Content-Length: 0
    Keep-Alive: timeout=2, max=100
    Connection: Keep-Alive
    Content-Type: text/plain
    ```

    ps：如果服务器否定了"预检"请求，会返回一个正常的 HTTP 回应，即不带跨域响应头，这时，浏览器就会认定，服务器不同意预检请求，因此触发一个错误。

    - Access-Control-Allow-Methods：该字段必需，它的值是逗号分隔的一个字符串，表明服务器支持的所有跨域请求的方法。
    - Access-Control-Allow-Headers：如果浏览器请求包括Access-Control-Request-Headers字段，则Access-Control-Allow-Headers字段是必需的。它也是一个逗号分隔的字符串，表明服务器支持的所有头信息字段，不限于浏览器在"预检"中请求的字段。
    - Access-Control-Max-Age：该字段可选，用来指定本次预检请求的有效期，单位为秒。

3. 浏览器发起正式请求，这个过程和简单请求一样，会有一个 Origin，服务器的回应也会有一个 `Access-Control-Allow-Origin`。

#### 跨域暴露响应头

CORS 请求时，`XMLHttpRequest` 对象的 `getResponseHeader()` 方法只能拿到 6 个基本字段：`Cache-Control`、`Content-Language`、`Content-Type`、`Expires`、`Last-Modified`、`Pragma`。如果想拿到其他字段，就必须在`Access-Control-Expose-Headers` 里面指定。

```
Access-Control-Expose-Headers: FooBar
```

#### 跨域 Cookie

- `XMLHttpRequest` 的 `withCredentials` 设置为 true
- 服务端响应头 `Access-Control-Allow-Credentials` 设置为 true（不能设置 false，不设置就是表示 false）
- 服务端响应头 `Access-Control-Allow-Origin` 不能设置为 `*`，必须指定明确的、与请求网页一致的域名。

ps：这是跨域简单请求和表单跨域请求的区别之处，表单请求支持跨域携带 Cookie

#### 其他

如果公司内部存在私有的 https 协议没有认证时，http 跨域请求 https 接口失败可能是因为 https 证书问题。反之如果 https 跨域请求 http 接口失败可能是因为浏览器的混合内容限制（blocked:mixed-content），即浏览器禁止 https 域名向 http 接口请求。

### 大文件分片上传和断点继传

- [Node + js实现大文件分片上传基本原理及实践(一)](https://www.cnblogs.com/tugenhua0707/p/11246860.html)
- [JavaScript 利用 Blob 进行分片上传](https://scarletsky.github.io/2015/01/27/javascript-upload-slice-file-using-blob/)
- [大文件上传优化，断点续传，分片上传](https://segmentfault.com/a/1190000038408148)
- [一个多文件断点续传、分片上传、秒传、重试机制的组件](https://juejin.cn/post/6850037258863673357#heading-7)

## FAQ

- [Can I use XMLHttpRequest on a different port from a script file loaded from that port?](https://stackoverflow.com/questions/1767443/can-i-use-xmlhttprequest-on-a-different-port-from-a-script-file-loaded-from-that)
- [Not able to set HTTP Host header on $.ajax request](https://stackoverflow.com/questions/8865896/not-able-to-set-http-host-header-on-ajax-request)

## 参考文献

- [规范](https://xhr.spec.whatwg.org/)
- [XMLHttpRequest API](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest)
- [FormData API](https://developer.mozilla.org/zh-CN/docs/Web/API/FormData)
- [Using XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest)
- [Using the XML HTTP Request object](http://jibbering.com/2002/4/httprequest.html)
- [XMLHttpRequest, REST and the Rich User Experience](http://www.peej.co.uk/articles/rich-user-experience.html)
- [New Tricks in XMLHttpRequest2](https://www.html5rocks.com/en/tutorials/file/xhr2/)
- [Retry XMLHttpRequest Carefully](https://lofi.limo/blog/retry-xmlhttprequest-carefully)

