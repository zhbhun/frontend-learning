history
========

## API

- 属性

    - history.length
    - history.scrollRestoration
    - history.state

- 方法

    - history.back()
    - history.forward()
    - history.go()
    - history pushState()
    - history.replaceState()

- 事件

    - window.onpopstate

## 误区

- window.onpopstate 只有在调用 history.back()，history.forward() 和 history.go() 时才会触发，调用 history pushState() 和 history.replaceState() 并不会触发
- ...

## 问题

- [history.pushState does not trigger 'popstate' event](https://stackoverflow.com/questions/10940837/history-pushstate-does-not-trigger-popstate-event)
- [history.pushState does not trigger 'popstate' event](https://stackoverflow.com/questions/10940837/history-pushstate-does-not-trigger-popstate-event/37492075)

## 工具

- [history.js](https://github.com/browserstate/history.js)
- [history](https://github.com/ReactTraining/history)


## 参考文献

- [Window.history](https://developer.mozilla.org/en-US/docs/Web/API/Window/history)
- [Manipulating the browser history](https://developer.mozilla.org/en-US/docs/Web/API/History_API)
- [深入学习History对象管理浏览器会话历史](http://blog.codingplayboy.com/2016/12/10/browser_history/)
- [HTML5 简介（三）：利用 History API 无刷新更改地址栏](https://www.renfei.org/blog/html5-introduction-3-history-api.html)
- [History 对象](https://javascript.ruanyifeng.com/bom/history.html)
- [URLSearchParams](https://javascript.ruanyifeng.com/bom/history.html) / [url-search-params](https://github.com/WebReflection/url-search-params)
