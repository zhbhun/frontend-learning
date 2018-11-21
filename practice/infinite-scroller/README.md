无限滚动
========

## 实现难点

- 当列表过长时你如何避免手机的卡顿？
- 将手机从竖屏改为横屏时你该如何处理 resize 事件？

## 技术要点

- DOM 回收

    > 利用那些离开视图区域的、已经创建的DOM元素，而不是新建 DOM 元素。

    > DOM 节点本身并非耗能大户，但是也不是一点都不消耗性能，每一个节点都会增加一些额外的内存、布局、样式和绘制。如果一个站点的 DOM 节点过多，在低端设备上会发现明显的变慢，如果没有彻底卡死的话。同样需要注意的一点是，在一个较大的 DOM 中每一次重新布局或重新应用样式（在节点上增加或删除样式所触发的过程）的系统开销都会比较昂贵。所以进行 DOM 回收意味着我们会保持 DOM 节点在一个比较低的数量上，进而加快上面提到的这些处理过程。

- 墓碑

    > 如果我们的用户飞快地滚动，他们会很容易就把我们渲染的有数据的项目都甩在身后。如果这种情况发生时，我们就需要放置一个墓碑条目（占位）在对应位置，等到数据取到后墓碑条目会被实际内容替代。墓碑也会被回收，对于墓碑元素会有一个独立的可复用DOM元素的池。这样设计的原因是，我们希望墓碑元素在被实际数据替代时可以有一个漂亮的过渡，而不是出现那种生硬的或者让人迷失的效果。

- 滚动锚定

    > 真实的条目的高度可能会超过墓碑的高度，因为不同的文本量或者图片的大小决定了这点。为了解决这个问题，每次当取到数据后我们会调整当前的滚动位置，而且在 viewport 之上的一个墓碑条目也会被替换。将滚动位置锚定到某一条目而非某一具体的像素位置，这个概念叫做滚动锚定。

    > 滚动锚定的触发时机有两个：一个是墓碑被替换时，另一个是窗口大小发生改变时（在设备发生翻转时也会发生）。我们必须要知道在 viewport 中的最顶部可见元素是什么。由于这个元素可能只是部分可见的，所以我们也需要存储从顶部元素到 viewport 顶部的偏移量。

- 重绘回流

    > 每次 DOM 元素的回收通常情况下都会引发整个 runaway 的重新布局，这会直接影响我们的性能：无法达成每秒 60 帧的目标。为避免这一点，我们自己承担了布局的重任，使用了绝对定位的元素。这样我们可以让所有 runaway 中的元素感觉上还在占用空间，但其实那里毛都没有。由于我们自己在操控布局，我们便可以缓存每个元素消失前的位置，在用户往回滚动时，我们能立刻从缓存中加载正确的元素。

- 优化

    - [CSS Containment in Chrome 52](https://developers.google.com/web/updates/2016/06/css-containment)

        > 这个特性允许开发者告诉浏览器某个元素是布局和绘制的边界。由于我们这里采用的是自己来布局，这是一个很好的可以应用 containment 的机会。当我们增加一个元素到 runaway 时，我们知道其它条目不应该被这个重新布局影响。所以每个条目应该设置一个 contain: layout。我们同样也不希望影响站点的其它部分，所以 runaway 本身也需要这样设置。

    - [IntersectionObservers](https://developers.google.com/web/updates/2016/04/intersectionobserver)

        > 检测用户是否已经滚动了足够距离，以便于我们决定是否开始回收DOM和加载新数据。但是 IntersectionObservers 是为高延迟设计的，所以我们实际上会“感觉”用了 IntersectionObservers 反而比不用时“响应更慢”。

    - [Houdini’s Compositor Worklet](https://developers.google.com/web/updates/2016/05/houdini)

## 开源项目

- [infinite-scroller](https://github.com/GoogleChromeLabs/ui-element-samples/tree/gh-pages/infinite-scroller)

## 参考文献

- [Complexities of an Infinite Scroller](https://developers.google.com/web/updates/2016/07/infinite-scroller) / [[译] 无尽滚动的复杂度 -- 来自 Google 大神的拆解](https://juejin.im/post/58a3c81e128fe10058c57a8b)
- [Infinite Scrolling Best Practices](https://uxplanet.org/infinite-scrolling-best-practices-c7f24c9af1d)
- [设计无限滚动下拉加载，实践高性能页面真谛](https://juejin.im/post/58b545f0b123db005734634e) / [设计高性能无限滚动加载，了解高效页面秘密](https://exp-team.github.io/blog/2017/02/25/js/infinite-scroll/)
- [无限滚动：彻底了解它](http://www.woshipm.com/pd/132888.html) / [无限下拉滚动 Vs 分页，究竟该使用哪一个？](http://www.woshipm.com/pd/350745.html)
- [从列表到详情，没你想的那么简单](https://zhuanlan.zhihu.com/p/32287890)
- [React或者RN里面对于无线滚动列表这种场景，有没有比较好的方案?](https://www.zhihu.com/question/55903947/answer/147728178)
