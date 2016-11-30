# 用法
```html
<div data-spy="affix" data-offset-top="60" data-offset-bottom="200">
  ...
</div>
```

or

```javascript
$('#myAffix').affix({
  offset: {
    top: 100,
    bottom: function () {
      return (this.bottom = $('.footer').outerHeight(true));
    },
  },
});
```

三种状态

- `.affix`
- `.affix-top`
- `.affix-bottom`

状态转换

1. 刚开始处于 `.affix-top` 状态
2. 然后滚动高度超过 `offset-top` 时，状态转为 `.affix`

    `.affix` 会使元素的 position 变为 fixed，这时的元素位置与原先距离顶部的距离一致，可以利用 `.affix` 选择器设置覆盖样式来控制元素位置

3. ...

# 示例
- navbar.html

    navbar-error1.html 演示了没有设置 offset-height 时，元素一开始就是 `.affix`

    narbar-error2.html 演示了没有覆盖样式时，默认的 `.affix` 元素位置是在哪里

- sidebar.html

# 应用
- 导航条
- 侧边栏

# TODO
1. offset-bottom 如何使用

