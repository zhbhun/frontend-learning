# Flutter

## Widget

- Type

  - StatelessWidget
  - StatefulWidget

- Lifecycle

  - State

    - initState
    - dispose

- Widgets

  - Layout

    - Container：容器，设置背景、边框、填充等属性，常用于包裹其他 Widget。
    - Row：水平布局
    - Column：垂直布局
    - Center：用于将子Widget居中显示
    - Expanded：用于在 Row 和 Column 中扩展子Widget的空间。
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
    - Navigator

  - Display

    - Button
    - FlatButton
    - IconButton
    - Text
    - Image
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
    - Table
    - CustomScrollView
    - NestedScrollView
    - VideoPlayer
    - Camera
    - AudioPlayer

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

## State

- State
- Provider

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

## Event

- ...

## Animation

- ...

## Network

- http
- serialization

    - dart:convert 
