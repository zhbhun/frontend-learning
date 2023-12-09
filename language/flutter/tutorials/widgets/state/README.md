# State

## Callbacks

  - initState：当 State 对象被插入树中时调用，表示初始化阶段。
  - didChangeDependencies：表示 State 对象依赖的对象发生变化时调用。
  - didUpdateWidget：在组件的配置发生变化（例如父组件重建时）时调用。
  - dispose：当 State 对象从树中被永久移除时调用，用于释放资源。
  - deactivate：当 State 对象从树中暂时移除时调用，用于释放资源(在一些场景下，Flutter 框架会将 State 对象重新插到树中，如包含此 State 对象的子树在树的一个位置移动到另一个位置)。
  - reassemble: 在热重载(hot reload)时会被调用

## Lifecycle

- Init

  - initState
  - didChangeDependencies
  - build

- InheritedWidget changed

  - didChangeDependencies
  - build

- Parent rebuild

  - didUpdateWidget
  - build

- Hot reload

  - reassemble
  - didUpdateWidget
  - build

- State change

  - build

- Destroy

  - deactivate
  - dispose
