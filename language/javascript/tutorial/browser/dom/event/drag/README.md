# 拖放

## 基础

- [HTML 拖放 API](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_Drag_and_Drop_API)
- [拖拽操作](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#dragfeedback)
- https://html.spec.whatwg.org/multipage/dnd.html#event-dnd-dragenter

### 事件流

1. dragstart：开始拖拽目标
2. drag...：正在拖拽目标
3. dragenter：进入拖放目标1
4. dragover：在拖放目标1上移动
5. dragleave：离开拖放目标1
6. dragenter：进入拖放目标2
7. dragover：在拖放目标2上移动
8. drop：放置拖拽目标到拖放目标2
9. dragend：结束拖拽目标

ps：这些事件都支持冒泡

### 开启拖拽

- 默认拖拽：在 HTML 中，除了图像、链接和选择的文本默认的可拖拽行为之外，其他元素在默认情况下是不可拖拽的。

    当一个图像或链接被拖拽时，图像或链接的 URL 被设定为拖拽数据。对于其他元素，只当它们是被选中的一部分时，才会触发默认拖拽行为。

- 手动开启

    1. 将想要拖拽的元素的 draggable 属性设置成 draggable="true"；
    2. 为拖拽元素的 dragstart 事件添加一个监听程序；
    3. 在 dragstart 事件处理函数中设置拖拽数据；

### 设置拖拽数据

- 设置拖拽文本：相当于拖拽选中文本，支持拖拽到浏览器地址栏显示

    ```js
    event.dataTransfer.setData('text/plain', 'This text may be dragged')
    ```

- 设置拖拽链接：相当月拖拽图片和超链接标签，支持拖拽到浏览器地址栏显示和新标签打开显示

    ```js
    event.dataTransfer.setData('text/uri-list', 'https://www.mozilla.org')
    ```

- 设置自定义数据：

    ```js
    event.dataTransfer.setData('id', '...')
    ```

参考

- [Recommended Drag Types](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Recommended_drag_types)

### 设置拖拽图像

- 默认：发生拖动时，从拖动目标生成半透明图像，并在拖动过程中跟随鼠标指针。
- 自定义：https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer/setDragImage

参考

- [如何自定义 drag 样式](https://segmentfault.com/a/1190000041881296)

### 设置拖拽效果

- 限制拖拽行为：在 dragstart 事件里可以设置拖拽目标允许的拖拽行为，

    ```js
    event.dataTransfer.effectAllowed = "copy";
    ```

    - none：不允许操作
    - copy：只复制
    - move：只移动
    - link：只链接
    - copyMove：复制或移动
    - copyLink：复制或链接
    - linkMove：链接或移动
    - all：复制、移动或链接

- 设置拖拽行为：在 dragover 或 dragenter 事件设置拖放目标支持的效果

    ```js
    event.dataTransfer.dropEffect = "copy";
    ```

    - copy：在新位置生成源项的副本
    - move：将项目移动到新位置
    - link：在新位置建立源项目的链接
    - none：项目可能禁止拖放


ps：拖拽效果会影响拖拽功能和鼠标显示

- 设置 effectAllowed 或 dropEffect 为 none 时，将会禁用拖拽（会有拖拽效果，但无法拖放到目标为止）
- 设置 dropEffect 为 copy 时，鼠标旁边会显示一个添加按钮（move 没有）

### 设置放置反馈

https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#%E6%94%BE%E7%BD%AE%E5%8F%8D%E9%A6%88

## 参考

- [一个拖拽，就暴露了国内外大厂的差距](https://zhuanlan.zhihu.com/p/505956645?utm_oi=35897751896064&utm_source=pocket_mylist)
