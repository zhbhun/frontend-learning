# hover / active / focus

| 浏览器 | PC | iOS | Android |
| --- | --- | --- | --- |
| :focus | 持续到失去焦点 | 不可用？ | 松开时进入，持续到失去焦点 |
| :hover | 悬停期间 | 按下时进入，持续到失去焦点(点击了其他元素) | 按下时进入，持续到失去焦点 |
| :active | 鼠标左键*按下期间 | 按下期间，但需绑定事件 | 按下期间 |
| tap-highlight-color | 不可用 | 按下期间，进入时稍有延迟 | 按下期间 |

## 存在问题

1. hover 在移动端时点击后生效的，相当于获取焦点，只有点击了其他元素失去焦点后才会取消 hover
2. active 在 iOS 下必须绑定 touch 事件才会生效

    - [IOS兼容:active伪类](https://blog.nowcoder.net/n/854a7cb924af4e5fb70b0f5df3c5141f?from=nowcoder_improve)

3. active 和 hover 效果会冒泡，子元素无法拦截阻止父元素的 active 和 hover。 

## 参考文献

- [点击态样式：focus, active, hover 的区别与兼容性](https://harttle.land/2018/05/17/hover-active-focus-highlight-color.html)
