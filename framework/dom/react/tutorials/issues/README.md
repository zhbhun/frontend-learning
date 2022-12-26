## 实现节流和防抖

- [How to use throttle or debounce with React Hook?](https://stackoverflow.com/questions/54666401/how-to-use-throttle-or-debounce-with-react-hook)
- [How and when to debounce or throttle in React](https://blog.logrocket.com/how-and-when-to-debounce-or-throttle-in-react/)
- [How to Correctly Debounce and Throttle Callbacks in React](https://dmitripavlutin.com/react-throttle-debounce/)
- [Improve Your React App Performance by Using Throttling and Debouncing](https://blog.bitsrc.io/improve-your-react-app-performance-by-using-throttling-and-debouncing-101afbe9055)
- https://github.com/gmcquistin/react-throttle
- [How to Use Debounce and Throttle in React and Abstract them into Hooks](https://www.freecodecamp.org/news/debounce-and-throttle-in-react-with-hooks/)

## 样式缩写冲突问题

问题原因：样式对象的属性是无需的，但是 CSS 的样式属性顺序是有关的，如果同事存在缩写和非缩写样式属性，可能会渲染出错。

- [Warn when using overlapping styles (e.g. border and borderBottom) ](https://github.com/facebook/react/issues/6348)
- [Shorthand CSS properties can cause style inconsistencies](https://github.com/facebook/react/issues/8689)
- [Using JavaScript to edit CSS gradient](https://stackoverflow.com/questions/15071062/using-javascript-to-edit-css-gradient/15071347#15071347)
- [Use cssText instead of setting css properties individually ](https://github.com/facebook/react/issues/5397)
- [Use inline style in React with plain CSS string](https://stackoverflow.com/questions/33331570/use-inline-style-in-react-with-plain-css-string)
- https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/cssText
