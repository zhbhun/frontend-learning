# Document

## 用法

### [`document​.ready​State`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/readyState)

描述文档的加载状态。

- `loading`：文档正在加载，即 DOM 结构正在解析，包括同步加载的样式和脚本资源。
- `interactive`：文档已经加载完成，即 DOM 结构被解析，包括同步加载的样式和脚本资源，但图片和异步加载的样式和脚本资源仍然在加载。

    ps：`document​.ready​State` 变为 `interactive` 时，不一定会触发 `DOMContentLoaded` 事件，`DOMContentLoaded` 会等待 `defer` 的脚本资源加载和执行完才会触发。

- `complete`：档和所有子资源已完成加载，load 事件即将被触发。

### 获取指定坐标下的元素

- [DocumentOrShadowRoot.elementFromPoint()](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementFromPoint)
- [DocumentOrShadowRoot.elementsFromPoint()](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementsFromPoint#%E6%B5%8F%E8%A7%88%E5%99%A8%E5%85%BC%E5%AE%B9%E6%80%A7)

### 滚动相关

获取滚动元素

- [document.scrollingElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollingElement)
- [document.scrollingElement polyfill](https://github.com/mathiasbynens/document.scrollingElement)
- [使用document.scrollingElement控制窗体滚动高度](https://www.zhangxinxu.com/wordpress/2019/02/document-scrollingelement/)

获取滚动位置

- `document.scrollingElement.scrollTop` / `document.scrollingElement.scrollLeft`
- [`Window.scrollY`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY) / [`Window.scrollX`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX)
- [`Window.pageYOffset`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageYOffset) / [`Window.pageXOffset`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageXOffset)

    window.scrollY 和 window.scrollX 的别名，但兼容性回更好。

调整滚动位置

- [`Window.scrollTo()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo) / [`Window.scroll()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scroll)
- [`Window.scrollBy()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollBy)
- [`document.scrollingElement.scrollTo()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo)
- [`document.scrollingElement.scrollTop`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop) / [`document.scrollingElement.scrollLeft`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft)
