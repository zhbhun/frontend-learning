# Event

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
