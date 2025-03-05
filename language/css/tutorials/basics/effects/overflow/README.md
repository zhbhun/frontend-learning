http://dev.mobify.com/blog/multiline-ellipsis-in-pure-css/

## [overscroll-behavior](https://developer.mozilla.org/zh-CN/docs/Web/CSS/overscroll-behavior)

overscroll-behavior 控制浏览器过度滚动时的表现。

- auto：“触底”效果 + 滚动链
- contain：“触底”效果
- none：
- clip

    - [Overflow Clip](https://ishadeed.com/article/overflow-clip/)

| 属性\效果 | “触底”效果 | 滚动链 |
| --- | --- | --- |
| auto | ✓ | ✓ |
| contain | ✓ | ✗ |
| none | ✗ | ✗ |

ps：在移动端设置为 contain，可以解决滚动穿透问题。
