- [Simple app state management](https://docs.flutter.dev/data-and-backend/state-mgmt/simple)
- [Flutter Architecture Samples](https://fluttersamples.com/)

## InheritWidget

- 监听：

  1. 子组件通过 context.dependOnInheritedWidgetOfExactType 来获取 InheritWidget（子类）；
  2. 子组件访问 InheritWidget（子类） 上的状态；

- 重建

  1. InheritWidget（子类）因为父组件触发了重新构建，接收到了新的值
  2. InheritWidget（子类）通过 updateShouldNotify 回调告知 Flutter 框架需要重建依赖自身的所有子组件。

ps：正常 InheritWidget（子类）重建也会触发子组件的重建，但是有些子组件是 cosnt 的，但是后代组件存在依赖 InheritWidget 的情况时，就会跳过中间层的组件，直接更新后代组件。
