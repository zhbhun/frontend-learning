# 响应

在用户注意到滞后之前我们有 100 毫秒的时间可以响应用户输入，这适用于大多数输入，不管他们是在点击按钮、切换表单控件还是启动动画。

这个示例提供两种交互场景：

- 切换 Tab：切换不同的 Tab 时，Tab 内容需要跟随变化
- 预约按钮：点击预约按钮，成功后将按钮改为“取消预约”，再次点击变回“预约”

底部的延迟选项可以设置交互后多久才能响应，过度效果开启后会在未响应前提供一个加载中提示。下面可以尝试选择不同的延迟大小，去感受下不同延迟带来的交互体验。