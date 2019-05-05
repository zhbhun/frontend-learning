盒模型
========

## 大小

- 屏幕大小

    - 简介：屏幕大小指的是 PC 的分辨率，移动端设备的逻辑像素。
    - 用法：`screen.width` / `screen.height`
    - 兼容性：IE6+
    - 备注：IE 会计算缩放大小（影响响应式布局），其他浏览器不会；

- 屏幕可用大小

    - 简介：等同于屏幕大小，如果在虚拟机中屏幕可用大小可能受影响
    - 用法：`screen.availWidth` / `screen.availHeight`
    - 兼容性：非标准
    - 备注：在 Windows 这样的操作系统中，这个可用高度不包括分配给半永久特性（如屏幕底部的任务栏）的垂直或水平空间

- 窗口大小

    - 简介：浏览器窗口大小，浏览器窗口大小是可以缩放的，并且屏幕部分区域是浏览器窗口无法占用的（除非全屏），例如：任务栏
    - 用法：`window.outerWidth` / `window.outerHeight`
    - 兼容性：IE9+

- 窗口可视区域大小

    - 简介：窗口大小减去窗口的边框，菜单栏，标签栏，地址栏等的高度或宽度
    - 用法：`window.innerWidth` / `window.innerHeight`
    - 兼容性：IE9+

- 网页可视区域大小

    - 简介：等价于窗口可视区域减去滚动条大小
    - 用法：`document.documentElement.clientWidth` / document.documentElement.clientHeight
    - 兼容性：IE6+
    - 备注：

        - doument 元素的 clientWidth 和 clientHeight 比普通元素更加特殊，它是包含自身的外边距和边框大小的；
        - document 元素的 offsetWidth 和 offsetHeight 在不同浏览器下计算规则不一致，一般使用该值；
        - document.body 元素的 client，offset，scroll 大小不能作为网页可视区域大小（body 只是普通的一个元素，可能存在外边距和边框等）

- 网页滚动区域大小

    - 简介：网页内容大小 + 网页内边距大小（不包含滚动条宽度和高度）
    - 用法：`document.documentElement.scrollWidth` / `document.documentElement.scrollHeight`
    - 备注：不能使用 document.body 来计算
    - 参考

        - [【转】获取scrollTop兼容各浏览器的方法，以及body和documentElement是啥？](http://www.cnblogs.com/xwgli/p/3490466.html)
        - [Document.body.scrollTop的值总为零的快速解决办法](http://www.jb51.net/article/86269.htm)
        - [火狐、谷歌、IE关于document.body.scrollTop和document.documentElement.scrollTop 以及值为0的问题](http://wo13145219.iteye.com/blog/2001598)

- 元素占用区域大小

    - 简介：元素可视内容大小 + 元素内边距大小 + 元素滚动条 + 元素边框，不包含外边距
    - 用法：`element.offsetWidth` / `element.offsetHeight`
    - 兼容性：？
    - 备注：

        - Webkit 浏览器的隐藏元素返回 null
        - 行内元素无法获取区域大小，始终返回 0

    ![dimensions-offset.png](./.attachment/dimensions-offset.png)

- 元素边框区域大小

    - 简介：一个元素顶部或左侧边框的宽度（以像素表示）
    - 用法：`element.clientLeft` / `element.clientTop`
    - 备注：如果元素的文本方向是从右向左，并且由于内容溢出导致左边出现了一个垂直滚动条，则该属性包括滚动条的宽度。

- 元素内容区域大小

    - 简介：元素可视内容大小 + 元素内边距大小，不包含滚动条，边框和外边距
    - 用法：`element.clientWidth` / `element.clientHeight`
    - 兼容性：IE6+
    - 备注

        - 行内元素无法获取区域大小，始终返回 0

    ![dimensions-client.png](./.attachment/dimensions-client.png)

- 元素滚动区域大小

    - 简介：元素实际内容大小 + 元素内边距大小
    - 用法：`element.scrollWidth` / `element.scrollHeight`

- 元素渲染区域大小

    - 简介：如果元素的样式出现变化，例如：缩放，那么元素实际渲染区域同样也会发生变化
    - 用法：`element.getBoundingClientRect()`

        ```javascript
        {
          top: number, // 从元素边框左上角开始计算，距离网页可视区域左上角的垂直距离
          left: number, // 从元素边框左上角开始计算，距离网页可视区域左上角的水平距离
          bottom: numeber, // 从元素边框左上角开始计算，距离网页区域右下角的垂直距离
          right: number, // 从元素边框左上角开始计算，距离网页区域右下角的水平距离
          width: number, // 不缩放的情况下，等价于元素占用区域大小
          height: bumber, // 不缩放的情况下，等价于元素占用区域大小
        }
        ```

    - 备注：如果元素的宽 `width:100px`，变化 `transform:scale(0.5)`，此时 `getBoundingClientRect()` 将返回宽 50，而 `offsetWidth` 将返回宽 100.

## 位置

- 屏幕位置

    - 简介：略
    - 用法：`screen.availTop` / `screen.availLeft`
    - 兼容性：非标准
    - 备注：一般不可用，都是返回 0

- 窗口位置

    - 简介：窗口边框左上角相对屏幕左上角的位置
    - 用法：`window.screenTop` / `window.screenLeft` / `window.screenX` / `window.screenY`
    - 兼容性：IE 浏览器的 `window.screenTop` 和 `window.screenLeft` 是从网页可视区域的左上角开始计算的

- 窗口滚动位置

    - 用法：`window.pageXOffset` / `window.pageYOffset` / `window.scrollX` / `window.scrollY`
    - 备注：不能通过修改该属性来控制滚动位置，请使用相应的 scroll 方法
    - 兼容性：

        - W3C 规范中 pageXOffset / pageYOffset 是 scrollX / scrollY 的别名，但是大部分浏览器只支持 pageXOffset 和 pageYOffset；
        - IE8 及以下版本的浏览器不支持这些属性，需要使用 `document.documentElement.scrollTop/Left` 来代替；
        - 在 IE 浏览器的怪异模式下需要使用 document.body.scrollTop/Left 来获取位置

    ```
    var supportPageOffset = window.pageXOffset !== undefined;
    var isCSS1Compat = ((document.compatMode || "") === "CSS1Compat");
    var x = supportPageOffset ? window.pageXOffset : isCSS1Compat ? document.documentElement.scrollLeft : document.body.scrollLeft;
    var y = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;
    ```

- 元素位置

    - 简介：当前元素边框左上角相对于其 offsetParent 元素的边框左上角的距离
    - 用法：`element.offsetTop` / `element.offsetLeft`
    - 备注：

        - offsetParent 指的是第一个定位属性不是静态定位的父元素，如果都没有，那就使用 document.documentElement
        - 固定定位元素的偏移量是相对于窗口的

- 元素滚动位置

    - 简介：元素滚动条的滚动垂直距离或水平距离
    - 用法：`element.scrollTop` / `element.scrollLeft`
    - 兼容性：？
    - 应用：可以修改元素的该值来控制滚动条

        - 如果一个元素不能被滚动, scrollTop 被设置为 0
        - 设置 scrollTop 的值小于 0，scrollTop 被设为 0
        - 如果设置了超出这个容器可滚动的值, scrollTop 会被设为最大值

    - 备注：注意如果这个元素的内容排列方向（direction） 是从右到左 ，那么滚动条会位于最右侧（内容开始处），并且 scrollLeft 值为 0。此时，当你从右到左拖动滚动条时，scrollLeft 会从 0 变为负数（这个特性在 chrome 浏览器中不存在）。

## 滚动

- API

    - [Window.scroll() | Element.scroll()](https://developer.mozilla.org/en-US/docs/Web/API/Window/scroll)
    - [Window.scrollTo() | Element.scrollTo()](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo)
    - [Window.scrollBy() | Element.scrollBy()](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollBy)
    - [Window.scrollByLines()](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollByLines)
    - [Window.scrollByPages()](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollByPages)
    - [Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
    - [Element.scrollIntoViewIfNeeded](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoViewIfNeeded)
    - [scroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior)

- Polyfill

    - [iamdustan/smoothscroll](https://github.com/iamdustan/smoothscroll)

- Reference

    - [Smooth Scrolling](https://css-tricks.com/snippets/jquery/smooth-scrolling/)
    - [Smooth Scrolling and Accessibility](https://css-tricks.com/smooth-scrolling-accessibility/)
    - [How to window.scrollTo() with a smooth effect [closed]](https://stackoverflow.com/questions/42261524/how-to-window-scrollto-with-a-smooth-effect)

## 监听

### Intersection Observer API

- [w3c/IntersectionObserver](https://github.com/w3c/IntersectionObserver)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [IntersectionObserver’s Coming into View](https://developers.google.com/web/updates/2016/04/intersectionobserver)
- [intersection-observer-polyfill](https://github.com/jeremenichelli/intersection-observer-polyfill)
- [IntersectionObserver API 使用教程](http://www.ruanyifeng.com/blog/2016/11/intersectionobserver_api.html)

## Scroll Event

- [MDN scroll](https://developer.mozilla.org/en-US/docs/Web/Events/scroll)
- [Why the Scroll Event Change in iOS 8 is a Big Deal](https://developer.telerik.com/featured/scroll-event-change-ios-8-big-deal/)
- [UIWebView | Javascript Scroll Events in iOS 7](https://poschel.wordpress.com/2013/08/29/uiwebview-javascript-scroll-events-in-ios-7/)

## 常见问题

### scroll VS scrollTo

- [JavaScript window.scroll vs. window.scrollTo?](https://stackoverflow.com/questions/1925671/javascript-window-scroll-vs-window-scrollto)

## 参考文献

- [Determining the dimensions of elements](https://developer.mozilla.org/zh-CN/docs/Web/API/CSS_Object_Model/Determining_the_dimensions_of_elements)
- [JS学习13：screen/client/offset/scroll/inner/avail的width/left](http://qianduanblog.com/post/js-learning-13-screen-client-offset-scroll-inner-avail-width-left.html)

---

## iOS 键盘与滚动

- window.innerHeight = window.innerHeight 初始值 - window.scrollY

    键盘弹出时会通过滚动 webview 容器的方式内容往上推，window 的内部高度等于没有弹出键盘时的出事高度减去键盘推动的滚动高度。

- document.documentElement.offsetHeight 等于 document.body.offsetHeight
- document.documentElement.scrollHeight 等于 document.body.scrollHeight
- document,documentElement.scrollTop 等于 0，document.body.scrollTop 等于实际滚动值
- window.scrollY 等于 document.body.scrollTop
