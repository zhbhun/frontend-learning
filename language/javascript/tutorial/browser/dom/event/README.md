# Event

## 基础

### [EventTarget](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget)

EventTarget 是一个 DOM 接口，由可以接收事件、并且可以创建侦听器的对象实现。

### 事件处理

- [event.stopPropagation](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopPropagation)
- [event.preventDefault](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault)
- [event.stopImmediatePropagation](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopImmediatePropagation)

### 坐标位置

- clientX/Y：获取到的是触发点相对浏览器可视区域左上角距离，不随页面滚动而改变。
- movementX/Y
- offsetX/Y：获取到是触发点相对被触发 DOM 的左上角距离
- pageX/Y：获取到的是触发点相对文档区域左上角距离，会随着页面滚动而改变
- layerX/Y：获取到的是触发点相对被触发 DOM（最接近的非默认定位）左上角的距离，类似 offsetX/Y
- screenX/Y：获取到的是触发点相对显示器屏幕左上角的距离，不随页面滚动而改变
- x/y：通 clientX / clientY

[JS基础篇--了解JS的clientX、pageX、screenX等方法来获取鼠标坐标详解](https://segmentfault.com/a/1190000002405897)

## 进阶

### 自定义事件

- old-fashioned：

    ```js
    // Create the event.
    const event = document.createEvent('Event');

    // Define that the event name is 'build'.
    event.initEvent('build', true, true);

    // Listen for the event.
    elem.addEventListener('build', function (e) {
    // e.target matches elem
    }, false);

    // target can be any Element or other EventTarget.
    elem.dispatchEvent(event);
    ```

- constructor：除了 IE，大多数现代浏览器都支持

    ```js
    const event = new Event('build');

    // Listen for the event.
    elem.addEventListener('build', function (e) { /* ... */ }, false);

    // Dispatch the event.
    elem.dispatchEvent(event);
    ```

- CustomEvent：支持添加自定义数据

    ```js
    const event = new CustomEvent('build', { detail: elem.dataset.time });
    elem.addEventListener('build', function (e) {
      console.log('The time is: ' + e.detail);
    }, false);
    elem.dispatchEvent(event);
    ```

参考文献

- [Creating and triggering events](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events)
- [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event)
- [Custom​Event](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
- [document.createEvent()](https://developer.mozilla.org/en-US/docs/Web/API/Document/createEvent)
- [Event.initEvent()](https://developer.mozilla.org/en-US/docs/Web/API/Event/initEvent)
- [EventTarget.dispatchEvent()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)
- [How to simulate a click with JavaScript?](https://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript)
- [document.createEvent fails](https://stackoverflow.com/questions/4645724/document-createevent-fails)
- [JavaScript 事件委托详解](https://zhuanlan.zhihu.com/p/26536815)
- [Custom events in JavaScript: A complete guide](https://blog.logrocket.com/custom-events-in-javascript-a-complete-guide/#how-do-javascript-custom-events-work)

### Point Events



---


- https://developer.mozilla.org/zh-CN/docs/Web/Events
- https://developer.mozilla.org/en-US/docs/Web/API/Event
- [HTML DOM: Which events do not bubble?](https://stackoverflow.com/questions/5574207/html-dom-which-events-do-not-bubble)

---

- [Warning: Added non-passive event listener to a scroll-blocking 'touchstart' event [duplicate]](https://stackoverflow.com/questions/46542428/warning-added-non-passive-event-listener-to-a-scroll-blocking-touchstart-even)

---

- [Get event listeners attached to node using addEventListener](https://stackoverflow.com/questions/9046741/get-event-listeners-attached-to-node-using-addeventlistener)

---

- [EventEmitter3](https://github.com/primus/eventemitter3)
- https://nodejs.org/api/events.html

---

- [Difference between “change” and “input” event for an `input` element](https://stackoverflow.com/questions/17047497/difference-between-change-and-input-event-for-an-input-element)


---

- [Creating and triggering events](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events)

---
