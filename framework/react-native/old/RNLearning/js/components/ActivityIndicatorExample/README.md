ActivityIndicator 显示一个圆形的 loading 提示符号。

# 样式
## 颜色
`color` 设置加载提示符的前景色，Android 默认为绿色，iOS 默认为灰色。

## 大小
`size` 设置加载提示符的大小，可以设置 small 和 large，默认为 small。

- small：高度为 20
- large：高度为 36

自定义大小

- **可以使用 transform 的 scale 来缩放控制加载提示符的大小；**
- **Android 除了设置 small 和 large 外，可以设置具体的数字来控制大小；**

# 动画
`animating` 控制是否要显示指示器，默认为true。设置为 false 时，**隐藏加载提示符**。

# 原理
- 组件结构：`View > RCTActivityIndicator`

    ActivityIndicator 实际上使用组件 View 包装一个原生组件 RCTActivityIndicator（加载提示符）来实现的。所以，ActivityIndicator 不只是个加载提示符，实际上是个带有加载提示的 View。

- 备注：ActivityIndicator 组件属性的 onLayout 和 style 会传给内部组件 View，这个 View 默认带有居中显示的样式（`{ justifyContent: center, alignItems: center }`）。 —— 所以，我们看到的加载提示符是居中的
