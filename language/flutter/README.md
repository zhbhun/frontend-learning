# Flutter

## Widget

- Type

  - StatelessWidget
  - StatefulWidget
  - RenderObjectWidget

    - LeafRenderObjectWidget
    - SingleChildRenderObjectWidget
    - MultiChildRenderObjectWidget

  - CustomPainter

- Lifecycle

  - State

    - Callbacks
 
      - initState：当 State 对象被插入树中时调用，表示初始化阶段。
      - didChangeDependencies：表示 State 对象依赖的对象发生变化时调用。
      - didUpdateWidget：在组件的配置发生变化（例如父组件重建时）时调用。
      - dispose：当 State 对象从树中被永久移除时调用，用于释放资源。
      - deactivate：当 State 对象从树中暂时移除时调用，用于释放资源(在一些场景下，Flutter 框架会将 State 对象重新插到树中，如包含此 State 对象的子树在树的一个位置移动到另一个位置)。
      - reassemble: 在热重载(hot reload)时会被调用

    - Lifes

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

- Keys

  - LocalKey

    - ObjectKey: 通过对象引用来标识子组件
    - ValueKey: 通过特定值来标识子组件
    - UniqueKey

  - GlobalKey

- context

  - 查找

    - findAncestorWidgetOfExactType
    - findAncestorStateOfType

- Widgets

  - Layout：布局组件控制子组件的大小和位置

    1、上层组件向下层组件传递约束（constraints）条件；2、下层组件根据上层约束确定自己的大小，然后告诉上层组件；3、上层组件确定下层组件相对于自身的偏移和确定自身的大小。

    ps：如果多个父级存在相同方向不同大小的多重限制，以满足所有条件为准。
    
    - 大小限制
      
      - ConstrainedBox + BoxConstraints

        - BoxConstraints.tight(size, size)
        - BoxConstraints.expand()

      - UnconstrainedBox：取消父组件的约束，子组件可以显示未任意大小

        ps：但实际实际占用大小还是以父组件约束为准

      - SizedBox：特定大小的容器

        - 未指定大小 | 无子节点：不显示
        - 未指定大小 | 有子节点 | 子节点大小不依赖父节点：适应子节点大小
        - 未指定大小 | 有子节点 | 子节点大小依赖父节点：必须设定大小
        - 指定大小 | 无子节点：根据父节点的大小约束尽可能显示指定大小
        - 指定大小 | 有子节点：强制子节点根据设定大小显示

      - LimitedBox：指定最大宽高
      - AspectRatio：指定子组件的长宽比
      - FractionallySizedBox：根据父容器宽高的百分比来设置子组件宽高等
      - IntrinsicWidth / IntrinsicHeight

    - 线性布局：

      - Row：水平布局：水平方向子组件的布局顺序

        - textDirection
        - mainAxisSize：在主轴(水平)方向占用的空间，默认是 MainAxisSize.max
        
          - MainAxisSize.max：尽可能多的占用水平方向的空间
          - MainAxisSize.min：尽可能少的占用水平空间

          ps：如果 Row 里面嵌套 Row，那么只有最外面的 Row 会占用尽可能大的空间，里面 Row 所占用的空间为实际大小，如果要让里面的 Column 占满外部 Column，可以使用Expanded 组件。

        - mainAxisAlignment：子组件在 Row 所占用的水平空间内对齐方式
        
          ps：只有 mainAxisSize 为 MainAxisSize.min 时，才会生效。

          - MainAxisAlignment.start：初始方向对齐
          - MainAxisAlignment.end
          - MainAxisAlignment.center：居中对齐

        - verticalDirection：纵轴（垂直）的对齐方向，默认是 VerticalDirection.down，表示从上到下。
        - crossAxisAlignment：子组件在纵轴方向的对齐方式，Row 的高度等于子组件中最高的子元素高度

          - CrossAxisAlignment.start
          - CrossAxisAlignment.end
          - CrossAxisAlignment.center
          - CrossAxisAlignment.stretch
          - CrossAxisAlignment.baseline

      - Column：垂直布局，同 Row

    - 弹性布局：
    
      - Flex：允许子组件按照一定比例来分配父容器空间。
      - Expanded：Expanded 只能作为 Flex 的孩子，可以按比例“扩伸”Flex子组件所占用的空间。

        - flex：弹性系数，如果为 0 或null，则child是没有弹性的，即不会被扩伸占用的空间。如果大于0，所有的Expanded按照其 flex 的比例来分割主轴的全部空闲空间。

    - 流式布局：

      - Wrap：用于自动换行的弹性布局，类似开启了 flex-wrap。

        - ...Flex
        - spacing：主轴方向子widget的间距
        - runSpacing：纵轴方向的间距
        - runAlignment：纵轴方向的对齐方式

      - Flow
    
    - 层叠布局

      - Stack：用于堆叠子 Widget，可用于创建复杂的叠加布局。
      - Positioned
    
    - 对齐和相对定位

      - Align：用于对齐子 Widget。

        - alignment：子组件在父组件中的起始位置

          - Alignment
          - FractionalOffset

        - widthFactor 和 heightFactor 是用于确定 Align 组件本身宽高的属性

      - Center：用于将子 Widget 居中显示
    
    - 布局计算

      - LayoutBuilder：通过 LayoutBuilder，我们可以在布局过程中拿到父组件传递的约束信息，然后我们可以根据约束信息动态的构建不同的布局。

  - Scrollable：按需加载列表布局

    - Compose

      - Scrollable ：用于处理滑动手势，确定滑动偏移，滑动偏移变化时构建 Viewport 。
      - Viewport：显示的视窗，即列表的可视区域；
      - Sliver：视窗里显示的元素。

    - Widgets

      - SingleChildScrollView
      - ListView
      - AnimatedList
      - GridView
      - PageView
      - TabBarView / Tabbar
      - Slivers
      - NestedScrollView
      - CustomScrollView

  - Container：布局组件倾向于控制多个子组件的排列和大小，而容器类组件一般只接收一个子组件，包装后添加样式修饰和变化等。

    - Padding：用于给子 Widget 添加内边距。

      - padding：
      
        - EdgeInsets.all(double value)
        - EdgeInsets.fromLTRB(double left, double top, double right, double bottom)
        - EdgeInsets.only({left, top, right ,bottom })
        - EdgeInsets.symmetric({ vertical, horizontal })

    - DecoratedBox：在其子组件绘制前(或后)绘制一些装饰（Decoration），如背景、边框、渐变等。

      - decoration：BoxDecoration，装饰样式

        - color：背景色
        - image：背景图片
        - border：边框
        - borderRadius：圆角
        - boxShadow：阴影
        - gradient：渐变

      - position：决定在哪里绘制 Decoration

        - background：在子组件之后绘制，即背景装饰。
        - foreground：在子组件之上绘制，即前景。

    - Transform：可以在其子组件绘制时对其应用一些矩阵变换来实现一些特效。

      - 属性

        - alignment
        - transform

      - 工具

        - Transform.translate
        - Transform.rotate
        - Transform.scale

    - RotatedBox
    
      Transform.rotate 功能相似，它们都可以对子组件进行旋转变换，但 RotatedBox 的变换是在 layout 阶段，会影响在子组件的位置和大小。

    - Container
    
      组合类容器，是 DecoratedBox、ConstrainedBox、Transform、Padding、Align 等组件组合的一个多功能容器。

      - alignment
      - margin
      - padding
      - width 和 height
      - constrains：同时存在 width 和 height 属性时，优先使用宽高属性
      - color
      - decoration：decoration 和 color 是互斥的，不能同时使用
      - foregroundDecoration
      - trasform

    - Clip

      - ClipOval
      - ClipRRect
      - ClipRect
      - ClipPath

    - FittedBox

      - 适配原理

        1. 在布局子组件时会忽略其父组件传递的约束，可以允许子组件无限大
        2. 对子组件布局结束后就可以获得子组件真实的大小
        3. 知道子组件的真实大小也知道他父组件的约束，那么 FittedBox 就可以通过指定的适配方式（BoxFit 枚举中指定），让起子组件在 FittedBox 父组件的约束范围内按照指定的方式显示。

      - fit：BoxFit

    - SafeArea：用于避开设备的安全区域，确保内容不被切割。

  - Navigator

    - CupertinoApp
    - MaterialApp
    - MaterialPageRoute
    - PageRouteBuilder
    - Navigator
    - Router
    - WillPopScope：拦截返回按钮

  - Feedback

    - RefreshIndicator
    - SnackBar

  - 弹框

    - 原理：所有弹框都是通过路由的形式实现的

      - ModalRoute：是基础的弹框，页面路由也是一种弹框
      - PopupRoute：盖在当前页面上的弹框，这种弹框一般有一个遮罩，点击后弹框小时
      
        ps：可以通过继承 PopupRoute 来自定义实现想要的弹框

      - RawDialogRoute：基础弹框

        - DialogRoute：增加了进场和出场动画，用于封装实现 showDialog
        - CupertinoDialogRoute：iOS风格

      - ModalBottomSheetRoute：底部弹框，用于封装实现 showModalBottomSheetRoute
      - CupertinoModalPopupRoute：iOS 风格的底部弹框

    - 遮罩：Barrier

      - ModalBarrier
      - AnimatedModalBarrier

    - 对话框：Dialog

      - showGeneralDialog：基础弹框，用来自定义实现自定义的弹框
      - showDialog：内容可自定义，但也预提供了以下几个组件

        - Dialog：最基础的对话框，内容完全自定义
        - SimpleDialog：支持提供多个选项的对话框
        - AlertDialog：确认框，提供 ok 或 cancel 等按钮

      - showCupertinoDialog：iOS 风格

    - 底部弹框

      - Scaffold.bottomSheet：在当前页面显示底部弹框，不会遮挡内容
      - showBottomSheet：同上
      - showModalBottomSheet：显示从底部弹出的对话框，会遮挡内容
      - showCupertinoModalPopup：iOS 风格的底部弹框

    - 悬浮框：Popover

      - Overlay：气泡卡片
      - PopupMenuButton：弹出菜单
      - showMenu

  - Utils

    - Builder

      - FutureBuilder
      - StreamBuilder

    - Clip

      - CustomClipper
      - ClipRect
      - ClipRRect
      - ClipOval
      - ClipPath

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

  - InheritedWidget
  - InheritedModel

- Global

  - ValueListenableBuilder
  - Provider
  - Scoped Model
  - Redux
  - BLoC / Rx
  - MobX

## Event

- Widget

  - Listenner：原始触摸事件处理
  - IgnorePointer：忽略本身和子组件的触摸事件
  - AbsorbPointer：忽略子组件的触摸事件
  - GestureDetector：手势识别

- Mechanism

  1. 命中测试
  2. 命中分发
  3. 事件清理

- Notification：

  在 widget 树中，每一个节点都可以分发通知，通知会沿着当前节点向上传递，所有父节点都可以通过 NotificationListener 来监听通知。

  - NotificationListener

## Animation

- 要素

  - Animation：保存动画的插值和状态，以及提供了监听插值和状态的方法。

    - value：当前值
    - addListener：帧监听
    - addStatusListener：动画状态监听

  - AnimationController：在 Animation 的基础上增加动画控制功能，支持控制动画前进或后退

    - duration：动画时长
    - vsync：刷新机制，设置一个 TickerProvider

  - Curve：动画插值的变化曲线

    - CurvedAnimation：贝塞尔曲线

      - linear：匀速
      - decelerate：匀减速
      - ease：开始加速，后面减速
      - easeIn：开始慢，后面快
      - easeOut：开始快，后面慢
      - easeInOut：开始慢，然后加速，最后再减速

  - Tween：用来来添加映射以生成不同的范围或数据类型的插值

    - ColorTween

- 使用

  1. 创建 AnimationController
  2. 基于 controller + curve + tween 组合创建新的 Animation
  3. 将动画值传递给需要的组件

    - 使用 StatefulWiget，然后监听 animation 的值变化
    - 使用 AnimatedWidget
    - 使用 AnimationBuilder
    - 使用 AnimatedSwitcher 

  4. 播放动画

- widget

  - Basic：通过传递的值变化来触发使用

    - AnimatedAlign
    - AnimatedCrossFade
    - AnimatedDefaultTextStyle：文本样式渐变
    - AnimatedFractionallySizedBox: 大小 + 位置变化渐变
    - AnimatedOpacity：透明度渐变
    - AnimatedPadding
    - AnimatedPositioned
    - AnimatedContainer
    - AnimatedDefaultTextStyle
    - AnimatedModalBarrier
    - AnimatedPadding
    - AnimatedPositioned
    - AnimatedPositionedDirectional
    - AnimatedRotation
    - AnimatedScale
    - AnimatedSize
    - AnimatedSlide

  - Custom：需要自定义 Animation 使用

    - AnimatedBuilder
    - AnimatedGrid
    - AnimatedList
    - AnimatedSwitcher
    - AnimatedWidget

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

- Load

  - 文本

    - `package:flutter/services.dart#rootBundle.loadString('...')`
    - `DefaultAssetBundle.of(context).loadString('...')`

  - 图片

    - AssetImage
    - Image.asset

## Storage

- path_provider: 文件读写
- shared_preferences:
- sqflite

## File

- 目录

  - 临时目录
  - 文档目录
  - 外部存储目录

## Network

- http

  - HttpClient

- socket

## Test

- Integration
- Unit
- Widget

## Tools

- Playground

  - https://dartpad.dev/
  - https://zapp.run/

- Debug

  - 断点

    - `debugger(when: offset > 30.0);`
  
  - 断言

    - `assert`

  - 日志

    - `print`
    - `debugPrint`
    - `flutter logs`

  - 审查

    - Widget 树：`debugDumpApp()`
    - 渲染树：`debugDumpRenderTree()`
    - Layer 树：`debugDumpLayerTree()`
    - 语义树：`debugDumpSemanticsTree()`
  
  - 渲染

    - 帧调度：debugPrintBeginFrameBanner 和 debugPrintEndFrameBanner
    - 可视化调试：debugPaintSizeEnabled、debugPaintBaselinesEnabled、debugPaintPointersEnabled 

  - 性能

    - 排查重绘和重新布局原因：debugPrintMarkNeedsLayoutStacks 和 debugPrintMarkNeedsPaintStacks
    - 统计应用启动时间：`flutter run --trace-startup --profile`
    - 性能跟踪和策略：`Timeline.startSync` 和 `Timeline.finishSync()`

- DevTools
- Package

  - 配置：pubspec.yaml

    - 依赖类型

      - dependencies
      - dev_dependencies

    - 依赖方式：

      - https://pub.dev/
      - local
      - git

  - 安装：`flutter packages get`

## Libyraries

- Flutter

  - `package:flutter/animation.dart`
  - `package:flutter/cupertino.dart`
  - `package:flutter/foundation.dart`
  - `package:flutter/gestures.dart`
  - `package:flutter/material.dart`
  - `package:flutter/painting.dart`
  - `package:flutter/physics.dart`
  - `package:flutter/rendering.dart`
  - `package:flutter/services.dart`
  - `package:flutter/scheduler.dart`
  - `package:flutter/semantics.dart`
  - `package:flutter/widgets.dart`

- core

  - `dart:async`
  - `dart:collection`
  - `dart:convert`
  - `dart:core`
  - `dart:developer`
  - `dart:math`
  - `dart:typed_data`
  - `dart:ui`
  - `dart:web_gl`

- VM

  - `dart:ffi`
  - `dart:io`
  - `dart:isolate`

- Web

  - `dart:html`
  - `dart:js`
  - `dart:js_interop`
  - `dart:js_util`

## Source

- 四棵树

  - Widget 树：由开发者创建
  - Element 树：根据 Widget 树生成
  - Render 树：根据 Element 树生成
  - Layer 树：根据 Render 树生成

  ps：真正的布局和渲染逻辑在 Render 树中，Element 是 Widget 和 RenderObject 的粘合剂。
