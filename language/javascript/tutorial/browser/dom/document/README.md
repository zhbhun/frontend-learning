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
