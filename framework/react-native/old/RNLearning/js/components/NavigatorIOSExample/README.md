# 内容
- 组件 + 传参
- 导航条：标题，返回，左侧按钮，右侧按钮

**路由对象结构**

```javascript
{
  // 组件
  component: function, // 显示组件
  passProps: object, // 传给显示组件的属性
  // 导航条
  title: string, // 导航条标题
  titleImage: Image.propTypes.source, // 导航条标题图片
  backButtonIcon: Image.propTypes.source, // 返回按钮图标
  backButtonTitle: string, // 返回按钮标题
  leftButtonIcon: Image.propTypes.source, // 左侧按钮图标
  leftButtonTitle: string, // 左侧按钮标题
  leftButtonSystemIcon: Object.keys(SystemIcons), // ？
  rightButtonIcon: Image.propTypes.source, // 右侧按钮图标
  rightButtonTitle: string, // 右侧按钮标题
  rightButtonSystemIcon: Object.keys(SystemIcons),
}
```

# 样式
Navigator 组件可以设置每个路由和导航条的默认样式：

- `barTintColor`：导航条背景色
- `navigationBarHidden`：是否隐藏导航条，默认为 false
- `shadowHidden`：?
- `tintColor`：？
- `titleTextColor`：标题文字颜色
- `translucent`：导航条默认是否透明
- `itemWrapperStyle`：显示组件的包装器样式，通常用于设置背景颜色


此外，也可以在每个路由对象上特殊化配置，下列配置属性会覆盖上面的默认属性配置：

```
{
  navigationBarHidden: bool, 
  shadowHidden: bool, 
  tintColor: string,
  barTintColor: string, 
  titleTextColor: string, 
  translucent: bool, 
  wrapperStyle: [object Object], // 对应 itemWrapperStyle
}
```

# 事件
**导航条交互事件：可以在每个路由对象上设置下列属性来实现**

```
{
  onLeftButtonPress: function, //  左侧按钮按压回调事件
  onRightButtonPress: function, // 右侧按钮按压回调事件
}
```

TODO：怎样监听路由跳转事件

# API
**路由跳转 / 替换 / 重置**

- push / pop

    - `pop(0)`
    - `popN(n)`
    - `popToRoute(route) `
    - `popToTop(0)`
    - `push(route)`

- replace

    - `replace(route)`
    - `replaceAtIndex(route, index)`
    - `replacePrevious(route)`
    - `replacePreviousAndPop(route)`
    - ``

- reset

    - `resetTo(route)`

TODO：怎样读取路由栈信息

# 其他
- `interactivePopGestureEnabled`
