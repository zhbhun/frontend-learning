# Flutter

## Widget

- Type

  - StatelessWidget
  - StatefulWidget

- Lifecycle

  - State

    - Callbacks

      - initState：当 State 对象被插入树中时调用，表示初始化阶段。
      - didChangeDependencies：表示 State 对象依赖的对象发生变化时调用。
      - didUpdateWidget：在组件的配置发生变化（例如父组件重建时）时调用。
      - shouldRebuild：决定是否需要重建组件，返回 true 会导致 build 方法被调用。
      - dispose：当 State 对象从树中被永久移除时调用，用于释放资源。
      - deactivate：当 State 对象从树中暂时移除时调用，用于释放资源。

    - Lifes

      - Init

        - initState
        - didChangeDependencies
        - build
    
      - Parent rebuild

        - didUpdateWidget
        - shouldRebuild
        - build
      
      - State change

        - didChangeDependencies
        - shouldRebuild
        - build

      - Destroy

        - dispose

- Keys

  - LocalKey

    - ObjectKey: 通过对象引用来标识子组件
    - ValueKey: 通过特定值来标识子组件
    - UniqueKey

  - GlobalKey

- Widgets

  - Layout

    - Container：容器，设置背景、边框、填充等属性，常用于包裹其他 Widget。
    - Row：水平布局
    - Column：垂直布局
    - Center：用于将子 Widget 居中显示
    - Expanded：用于在 Row 和 Column 中扩展子 Widget 的空间。
    - Flexible：同上
    - Padding：用于给子 Widget 添加内边距。
    - Wrap： 用于自动换行的流式布局。
    - Stack：用于堆叠子 Widget，可用于创建复杂的叠加布局。
    - Align：用于对齐子 Widget。
    - SafeArea：用于避开设备的安全区域，确保内容不被切割。

  - Navigator

    - CupertinoApp
    - MaterialApp
    - MaterialPageRoute
    - PageRouteBuilder
    - Navigator
    - Router

  - Display

    - Button
    - FlatButton
    - IconButton
    - Text
    - Icon
    - Card
    - Chip
    - Divider
    - Spacer
    - Placeholder
    - FractionallySizedBox
    - AspectRatio
    - SingleChildScrollView
    - ListView
    - GridView
    - CustomScrollView
    - NestedScrollView
    - Table

  - Media

    - AudioPlayer
    - Camera
    - Image

      - Image.file(File('file:///...'))
      - FadeInImage

    - VideoPlayer

  - Form

    - TextField
    - Checkbox
    - Radio
    - Switch
    - Slider
    - DropdownButton
    - DatePicker
    - TimePicker
    - Form

  - Feedback

    - RefreshIndicator
    - SnackBar

  - Interaction

    - BottomNavigationBar
    - GestureDetector
    - InkWell
    - PopupMenuButton
    - TabBar

  - Animation

    - AnimatedContainer
    - AnimatedOpacity
    - AnimatedAlign
    - AnimatedBuilder
    - Hero
    - SlideTransition
    - FadeTransition
    - ScaleTransition
    - RotationTransition

  - Async

    - FutureBuilder
    - StreamBuilder
    - Future.delayed
    - StreamController

  - Canvas
    - CustomPaint
    - ClipPath
    - Canvas
    - Path
    - Paint
    - BezierCurveTo
  - Cupertino

    - CupertinoApp
    - CupertinoNavigationBar
    - CupertinoButton
    - CupertinoTextField
    - CupertinoPicker
    - CupertinoActivityIndicator
    - CupertinoDialog
    - CupertinoSlider
    - CupertinoTabBar
    - CupertinoPageScaffold

  - Material

    - MaterialApp
    - AppBar
    - FloatingActionButton
    - Drawer
    - BottomNavigationBar
    - BottomSheet
    - MaterialButton

## Style

- BoxConstraints
- TextStyle
- Theme

## State

- Local

  - State

- Context

  - InheritedWidget & InheritedModel

- Global

  - Provider
  - Riverpod
  - Redux
  - Fish-Redux
  - BLoC / Rx
  - GetIt
  - MobX
  - Binder
  - GetX
  - states_rebuilder
  - Triple Pattern

## Event

- ...

## Animation

- PageRouteBuilder

## Assets

- Type

  - JSON
  - Image
  - Audio
  - Video

- Specific

  - flutter:assets:assets/my_icon.png
  - flutter:assets:assets/

- Variants

  - Local
  - Resolution
  - Theme

## Storage

- path_provider: 文件读写
- shared_preferences:
- sqflite

## Network

- http
- serialization

  - dart:convert

## Test

- Integration
- Unit
- Widget
