# Element

## offset vs client vs scroll

![offset-vs-client-vs-scroll.png](./offset-vs-client-vs-scroll.png)


- offsetWidth/offsetHeight：width + padding + border + scrollbar
- clientWidth/clientHeight：width + padding

---

- offsetTop/offsetLeft：相对 offsetParent 的偏移量（原点是各自的边框左上角）
- clientTop/clientLeft：上边框和左边框的宽度

参考文献

- [Element.clientWidth](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/clientWidth)
- [Element.scrollWidth](https://developer.mozilla.org/zh-CN/docs/Web/API/element/scrollWidth)
- [HTMLElement.offsetWidth](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/offsetWidth)
- [Element.clientLeft](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/clientLeft)
- [Element.scrollLeft](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollLeft)
- [HTMLElement.offsetLeft](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/offsetLeft)
- [Understanding offsetWidth, clientWidth, scrollWidth and -Height, respectively](https://stackoverflow.com/questions/21064101/understanding-offsetwidth-clientwidth-scrollwidth-and-height-respectively#comment38602697_21064102)

## getBoundingClientRect vs getClientRects

- [Element.getBoundingClientRect()](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getBoundingClientRect)
- [Element.getClientRects()](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getClientRects)

---

- [聊聊 getBoundingClientRect 和 getClientRects 方法](https://zhuanlan.zhihu.com/p/38568124)
- [那些你不知道的 getClientRects()](https://segmentfault.com/a/1190000016541461)

## style

- [CSSStyleDeclaration](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration)
- [CSSStyleDeclaration.cssText](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/cssText)
- [Using dynamic styling information](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Using_dynamic_styling_information)
