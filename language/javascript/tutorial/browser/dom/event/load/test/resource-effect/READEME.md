测试图片不同加载时机对 load 事件的影响

- 阻塞

    - html 带 img 标签
    - script 里立刻往 body 里插入 img 标签
    - script 等待 DOMContentLoaded 触发后往 body 里插入 img 标签

- 非阻塞

    - script 等待 DOMContentLoaded 触发且延迟 0 秒后往 body 里插入 img 标签

        如果触发 DOMContentLoaded 事件后，没有加载中的其他资源了，那么就触发 load 事件，后续的事件回调里加入的资源请求不再影响 load 事件
