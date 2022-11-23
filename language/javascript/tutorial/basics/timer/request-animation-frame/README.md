# [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

- 什么时候执行？

    在下一次重绘之前执行一个回调函数。

- 执行的频率？

    在没有任何阻塞的情况下，requestAnimationFrame 大约每隔 16ms 触发一次（跟系统和屏幕的刷新率有关系），参见示例 [interval.html](./interval.html)。

    ps：最初 Webkit 使用定时器进行渲染间隔控制， 2014 年时开始 [使用显示器的 vsync 信号控制渲染](https://bugs.chromium.org/p/chromium/issues/detail?id=337617)（其实直接控制的是合成这一步）。

- 重绘重排的影响？

    DOM 操作调整布局时会触发重排重绘，默认浏览器会合并渲染一帧之间的所有 DOM 操作，但如果有访问 DOM 的大小等布局信息，浏览器会立刻进行重排并返回调整后的布局信息，但不会立刻渲染，参见示例 [reflow.html](./reflow.html)。

- 后台暂停？

    为了提升性能和减少电源损耗，浏览器标签页在后台运行或者 iframe 被隐藏时，会暂停执行 requestAnimationFrame；

## 参考文献

- [requestAnimationFrame Refresh Rate](https://stackoverflow.com/questions/16695422/requestanimationframe-refresh-rate)
- VSYNC

    - https://www.testufo.com /[Browser supports VSYNC!](https://www.testufo.com/browser.html)
    - [What is VSync, and when should you use it?](https://www.digitaltrends.com/computing/what-is-vsync/)
    - [Web browser "VSYNC synchronization" tester](https://www.vsynctester.com/)
    - [How to accurately compute VSYNC timing information](https://www.vsynctester.com/howtocomputevsync.html)
    - [VSYNC in Firefox 50.0.2 under Windows is broken](https://www.vsynctester.com/firefoxisbroken.html)
    - [How can I get vsync callback on HTML5 canvas?](https://stackoverflow.com/questions/6025661/how-can-i-get-vsync-callback-on-html5-canvas)
    - [Strengthen requestAnimationFrame() spec for VSYNC / refresh rate matching in HTML 5.2 ](https://github.com/w3c/html/issues/785)

- [浏览器的 16ms 渲染帧](https://harttle.land/2017/08/15/browser-render-frame.html)
