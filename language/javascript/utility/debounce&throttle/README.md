防抖动（Debouncing）和节流阀（Throttling）
========

- [Debouncing and Throttling Explained Through Examples](https://css-tricks.com/debouncing-throttling-explained-examples/)
- [Debouncing Javascript Methods](http://unscriptable.com/2009/03/20/debouncing-javascript-methods/)
- [实例解析防抖动（Debouncing）和节流阀（Throttling）](https://jinlong.github.io/2016/04/24/Debouncing-and-Throttling-Explained-Through-Examples/)

# 使用方法

- [debounce](https://github.com/lodash/lodash/blob/master/debounce.js)
- [throttle](https://github.com/lodash/lodash/blob/master/throttle.js)
- [requestAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)

# 实际应用

- 防抖动

    - 处理调整桌面浏览器窗口大小的事件
    - 基于 AJAX 请求的自动完成功能，通过 keypress 触发
    - 相似的使用场景还有，直到用户输完，才验证输入的正确性，显示错误信息。

- 节流阀

    - 处理滚动事件
