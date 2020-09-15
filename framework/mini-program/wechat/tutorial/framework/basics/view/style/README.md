# 样式

额外特性

- 尺寸单位 rpx
- 样式模块化
- 作用域范围

    - 全局：app.wxss 中的样式为全局样式
    - 页面：在 page 的 wxss 文件中定义的样式为局部样式，只作用在对应的页面，并会覆盖 app.wxss 中相同的选择器。

存在问题

- 级联选择器支持不完善

    - [wxss样式表支持级联选择吗？](https://developers.weixin.qq.com/community/develop/doc/be53a24de3902377c05db8ab9c742dd0)

参考文献

- [WXSS 指南](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)
