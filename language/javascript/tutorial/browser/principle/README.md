# 原理

## 流程

- WebKit

    ![WebKit 主流程](./.assets/webkitflow.png)

    1. Document Object Model(DOM) + CSS object model(CSSOM)
    2. Render Tree
    3. Layout
    4. Paint

- Gecko

    ![Gecko 主流程](./.assets/geckoflow.jpg)

    1. Document Object Model(DOM) + CSS object model(CSSOM)
    2. Frame Tree
    3. Reflow
    4. Paint


## 重排/回流

测试示例

- [Chrome 重排调试](./examples/reflow-inspect)

## 重绘

TODO

## 渲染队列机制

TODO

## 重排重绘优化

- 分离读写操作

    ```javascript
    div.style.left = '10px';
    div.style.top = '10px';
    div.style.width = '20px';
    div.style.height = '20px';
    console.log(div.offsetLeft);
    console.log(div.offsetTop);
    console.log(div.offsetWidth);
    console.log(div.offsetHeight);
    ```

- 缓存布局信息

    ```javascript
    // bad 强制刷新 触发两次重排
    div.style.left = div.offsetLeft + 1 + 'px';
    div.style.top = div.offsetTop + 1 + 'px';

    // good 缓存布局信息 相当于读写分离
    var curLeft = div.offsetLeft;
    var curTop = div.offsetTop;
    div.style.left = curLeft + 1 + 'px';
    div.style.top = curTop + 1 + 'px';
    ```

- 样式集中改变

    ```javascript
    // bad
    var left = 10;
    var top = 10;
    el.style.left = left + "px";
    el.style.top  = top  + "px";
    // good
    el.className += " theclassname";
    // good
    el.style.cssText += "; left: " + left + "px; top: " + top + "px;";
    ```

- 离线改变 DOM

    - 隐藏要操作的 DOM：在要操作 DOM 之前，通过 `display` 隐藏 DOM，当操作完成之后，才将元素的 `display` 属性为可见，因为不可见的元素不会触发重排和重绘。
    - 通过使用 [DocumentFragment](https://developer.mozilla.org/zh-CN/docs/Web/API/DocumentFragment) 创建一个 DOM 碎片,在它上面批量操作 DOM，操作完成之后，再添加到文档中，这样只会触发一次重排。
    - 复制节点，在副本上工作，然后替换它！

- `position` 属性为 `absolute` 或 `fixed`


## 参考文献

- [How browsers work](http://taligarsiel.com/Projects/howbrowserswork1.htm)
- [浏览器的工作原理：新式网络浏览器幕后揭秘](https://www.html5rocks.com/zh/tutorials/internals/howbrowserswork/)
- [掌握浏览器重绘(reflow)重排(repaint)-前端进阶](https://segmentfault.com/a/1190000017491520)
- [网页性能管理详解](http://www.ruanyifeng.com/blog/2015/09/web-page-performance-in-depth.html)
- [优化CSS重排重绘与浏览器性能](http://caibaojian.com/css-reflow-repaint.html)
- [Understanding the critical rendering path, rendering pages in 1 second](https://medium.com/@luisvieira_gmr/understanding-the-critical-rendering-path-rendering-pages-in-1-second-735c6e45b47a)
- [How does a browser work?](https://www.quora.com/How-does-a-browser-work)
- [构建对象模型](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/constructing-the-object-model)
- [A Closer Look At Font Rendering](https://www.smashingmagazine.com/2012/04/a-closer-look-at-font-rendering/)
- [Web working principles](https://astaxie.gitbooks.io/build-web-application-with-golang/en/03.1.html)
- [CSS GPU Animation: Doing It Right](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- [Efficiently Rendering CSS](https://css-tricks.com/efficiently-rendering-css/)
