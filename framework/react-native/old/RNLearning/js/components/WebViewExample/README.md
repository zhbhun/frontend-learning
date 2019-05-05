# 内容
## 本地网页

- 字符串：`{ html: String }`
- 模块：`require('./xxx.html')`

示例：

- [WebViewStaticHTMLTest.js](./WebViewStaticHTMLTest.js)
- [WebViewBundledHTMLTest.js](./WebViewBundledHTMLTest.js)

## 远程网页

远程网页可以配置 uri(链接)，method（请求方法），headers（请求头），body（请求主体）。

示例：[UriPOSTTest.js](./UriPOSTTest.js)

## 渲染方法
- `renderLoading`：设置一个函数，返回一个加载指示器 —— 必须结合 `startInLoadingState` 使用；
- `renderError`：设置一个函数，返回一个视图用于显示错误 —— 具体用法未知，无法使用；
- `startInLoadingState`：是否强制 WebView 在首次加载时显示加载动画，如果没有设置 `renderLoading`，则显示默认动画，否则调用 renderLoading，默认为 false；

常见问题

- [Webview loading state (renderLoading) is never shown](https://github.com/facebook/react-native/issues/915)

# 样式
- **WebView 默认 flex 等于 1，要设置具体高度可以使用 View 来包装，并在该 View 上设置具体高度**；
- `scalesPageToFit` 设置是否要把网页缩放到适应视图的大小，以及是否允许用户改变缩放比例，默认为 true。

    **疑问：网页是否允许缩放可以使用过 HTML 的 meta viewport 标签控制，`scalesPageToFit` 要在什么情况下使用呢？ —— 有些网页没有配置 meta viewport 时，可以使用 `scalesPageToFit` 来优化 WebView 显示。**

    示例：[WebViewScaleTest.js](./WebViewScaleTest.js)

- ...

# 事件
要点

1. 熟悉 `nativeEvent` 的数据结构，以及不同事件对象的结构；

    - onLoadStart, onLoad, onLoadEnd, onMessage: `{ nativeEvent }`
    - onNavigationStateChange: `{...nativeEvent}`
    - onError: **TODO**

2. 熟悉不同动作触发的相应事件：初始化，跳转，前进，后退，加载失败等；
3. 熟悉状态转变

    - onLoadStart 时 loading 为 true，onLoad 时 loading 为 false
    - 前进或跳转 onLoadStart 时 canGoBack 就变为 true
    - 后退 onLoadStart 时 canGoForward 就变味 true

疑问

- 为什么 onLoadStart 和 onNavigationStateChange 会触发两次？

示例：[WebViewEventTest.js](./WebViewEventTest.js)

## nativeEvent 数据结构

**onLoadStart, onLoad, onLoadEnd, onNavigationStateChange**

```javascript
{
  canGoForward: Boolean,
  canGoBack: Boolean,
  loading: Boolean,
  title: String,
  url: String,
  target: Number,
}
```

**onMessage**

```javascript
{
  data: String,
}
```

**onError**

## 初始化事件
1. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: false,
        loading: true,
        title: '',
        url: 'url',
      },
    }
    ```

2. onNavigationStateChange - 同上，但 event = nativeEvent

3. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: false,
        loading: true,
        title: 'url',
        url: 'url',
      },
    }
    ```

4. onNavigationStateChange - 同上，但 event = nativeEvent

5. onLoad

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: false,
        loading: false,
        title: 'title',
        url: 'url',
      },
    }
    ```

6. onLoadEnd - 同上
7. onNavigationStateChange - 同上，但 event = nativeEvent

## 页面跳转
1. onMessage

    ```javascript
    {
      nativeEvent: {
        data: String,
      }
    }
    ```

2. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: false,
        loading: true,
        title: 'old title',
        url: 'new url',
      },
    }
    ```

3. onNavigationStateChange - 同上，但 event = nativeEvent
4. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: true,
        loading: true,
        title: 'new url',
        url: 'new url',
      },
    }
    ```

5. onNavigationStateChange - 同上，但 event = nativeEvent
6. onLoad

    ```javascript
    {
      nativeEvent: {
        canGoForward: false,
        canGoBack: true,
        loading: false,
        title: 'new title',
        url: 'new url',
      },
    }
    ```

7. onLoadEnd - 同上
8. onNavigationStateChange - 同上，但 event = nativeEvent

## 返回
1. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: true,
        canGoBack: false,
        loading: true,
        title: 'current title',
        url: 'previous url',
      },
    }
    ```

2. onNavigationStateChange - 同上，但 event = nativeEvent
3. onLoadStart

    ```javascript
    {
      nativeEvent: {
        canGoForward: true,
        canGoBack: false,
        loading: true,
        title: 'previous url',
        url: 'previous url',
      },
    }
    ```

4. onNavigationStateChange - 同上
5. onLoad

    ```javascript
    {
      nativeEvent: {
        canGoForward: true,
        canGoBack: false,
        loading: false,
        title: 'previous title',
        url: 'previous url',
      },
    }
    ```

6. onLoadEnd - 同上
7. onNavigationStateChange - 同上，但 event = nativeEvent

## 前进
类似 "后退"

## 错误
略

# API
- goBack - 后退
- goForward - 前进
- postMessage - 发送消息
- stopLoading - ？
- updateNavigationState - ？
- ...

示例：[APITest.js](./APITest.js)

## 通信
React Native

- 接受消息

    ```javascript
    onMessage(event) {
      // event.nativeEvent.data
    }

    ```

- 发送消息

    `this.refs.webview.postMessage('xxx');`

HTML

- 接受信息

    ```javascript
    document.addEventListener('message', function(e) {
      // e.data
    });

    ```
    
- 发送消息

    `window.postMessage('xxx');`

示例：[MessagingTest.js](./MessagingTest.js)

# 其他
- `injectedJavaScript` - 只有初始化和 `onNavigationStateChange` 的时候才会执行脚本？

# 常见问题
## iOS WebView 组件会将一串连续的数字识别为可点击的链接（电话号码）
- 问题：如题
- 解决

    - 使用 WebView 组件的属性 dataDetectorTypes 来控制是否识别特殊数据为可点击链接
    - 在 HTML 添加 `<meta name="format-detection" content="telephone=no">`

## WebView 上的文本可长按选择
在浏览器上上长按网页会出现特殊的功能菜单，如下所示：

- 浏览器长按

    - 文本 / 按钮 / 输入框：选择功能
    - 链接：链接功能
    - 图片：图片功能
    - 链接内嵌图片：链接图片功能

WebView 已经自动帮助我们禁用了长按链接，图片，链接内嵌图片时的效果，但长按普通文本，按钮和输入框的效果与浏览器一致。使用 CSS 代码 `* { -webkit-user-select: none; }` 可以禁用所有元素的长按赋值效果。

兼容性问题

有些版本的 Android 不支持 `-webkit-user-select`，另外该属性会禁用所有元素的长按选择效果，甚至会影响 iOS 输入框获取焦点（Android 不会），而且有些场景确实需要赋值文本。

参考文献

- [user-select](https://developer.mozilla.org/zh-CN/docs/Web/CSS/user-select)
- [Android: Disable text selection in a webview](http://stackoverflow.com/questions/5107651/android-disable-text-selection-in-a-webview)
- https://bencollier.net/2010/04/disabling-hold-to-copy-on-mobile-safari/
- http://stackoverflow.com/questions/923782/disable-the-text-highlighting-magnifier-on-touch-hold-on-mobile-safari-webkit
- http://stackoverflow.com/questions/23556856/ios-browser-disable-copy-but-highlight-text-css-javascript
- http://stackoverflow.com/questions/14816031/disabling-the-copy-feature-in-ipad-safari-browser
- http://stackoverflow.com/questions/5107651/android-disable-text-selection-in-a-webview
- http://stackoverflow.com/questions/5995210/disabling-user-selection-in-uiwebview
- http://stackoverflow.com/questions/6676369/how-to-disable-copy-and-paste-in-uiwebview
- http://stackoverflow.com/questions/36804904/how-do-i-disable-copy-and-paste-user-selection-in-uiwebviews
- http://stackoverflow.com/questions/20851026/cant-disable-copy-uiwebview
- http://stackoverflow.com/questions/14970181/disable-copy-in-uiwebview-but-not-select
- http://stackoverflow.com/questions/11684632/android-how-to-disable-text-selection-in-webview-for-android-4-0
- http://stackoverflow.com/questions/11290613/disable-copy-and-paste-in-uiwebview-unsolved


# TODO
- [react native webview load from device local file system](http://stackoverflow.com/questions/33506908/react-native-webview-load-from-device-local-file-system)
