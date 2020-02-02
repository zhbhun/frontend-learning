# 滚动

![scrolling-mindmap.jpg](./scrolling.mindmap.jpg)

- ScrollView：滚动视图，不同滚动视图子组件渲染机制不一样，例如 SingleChildScrollView 的子组件只有一个，ListView 的子组件是一个列表，GridView 的子组件是一个网格
- Scrollbar：滚动条，指示当前的滚动位置
- RefreshIndicator：下拉刷新，一种刷新滚动内容的交互方式
- ScrollController：控制器，控制和监听滚动你位置
- ScrollPhysics：物理效果，决定可滚动组件响应用户操作的行为，例如 iOS 的弹性拖动

## ScrollView

![scroll_view.mindmap.jpg](./scroll_view.mindmap.jpg)

- SingleChildScrollView：只有一个 Child，通常配合 Column 使用
- ListView：可滚动的列表
- GridView：可滚动的网格
- CustomScrollView：定制化的滚动视图，Child 可以是 AppBar，实现可浮动的导航栏，也可以内嵌 ListView 和 GridView。
- NestedScrollView：嵌套滚动视图，可以用来实现 TabBar 吸顶功能
- PageView：按页滚动的视图，每一个 Child 都是同样大小
- ListWheelScrollView：类似 ListView 是个可滚动的列表，但显示效果不一样，ListWheelScrollView 滚动时像“轮子”一样转动，例如：用来实现一个 iOS 风格的选择器。

![scroll_view.inheritance.jpg](./scroll_view.inheritance.jpg)

Scrollable 实现了核心的滚动交互模型，例如手势识别，但它不负责子节点如何构造和显示。而各个 ScrollView 都封装了 Scrollable，从而实现了各种各种样式的滚动组件，但他们都存在一些共同的配置属性。

- controller：此属性接受一个 [ScrollController](https://api.flutter.dev/flutter/widgets/ScrollController-class.html) 对象。ScrollController 的主要作用是控制滚动位置和监听滚动事件。默认情况下，Widget 树中会有一个默认的 PrimaryScrollController，如果子树中的可滚动组件没有显式的指定 controller，并且 primary 属性值为true时（默认就为true），可滚动组件会使用这个默认的 PrimaryScrollController。这种机制带来的好处是父组件可以控制子树中可滚动组件的滚动行为，例如，Scaffold 正是使用这种机制在 iOS 中实现了点击导航栏回到顶部的功能。
- physics：此属性接受一个 [ScrollPhysics](https://api.flutter.dev/flutter/widgets/ScrollPhysics-class.html) 类型的对象，它决定可滚动组件如何响应用户操作，比如用户滑动完抬起手指后，继续执行动画，或者滑动到边界时，如何显示。默认情况下，Flutter 会根据具体平台分别使用不同的 ScrollPhysics 对象，应用不同的显示效果，如当滑动到边界时，继续拖动的话，在 iOS 上会出现弹性效果，而在 Android 上会出现微光效果。如果你想在所有平台下使用同一种效果，可以显式指定一个固定的   ScrollPhysics，Flutter SDK 中包含了两个 ScrollPhysics 的子类，他们可以直接使用：

    - ClampingScrollPhysics：Android下微光效果。
    - BouncingScrollPhysics：iOS下弹性效果。

- scrollDirection：滚动方向。

### [SingleChildScrollView](https://api.flutter.dev/flutter/widgets/SingleChildScrollView-class.html)

- [SingleChildScrollView](https://book.flutterchina.club/chapter6/single_child_scrollview.html)

#### 配置

- scrollDirection：滚动方向，横向或者纵向
- reverse：是否按照阅读方向相反的方向滑动，如：scrollDirection 值为 Axis.horizontal，如果阅读方向是从左到右(取决于语言环境，阿拉伯语就是从右到左)。reverse 为 true 时，那么滑动方向就是从右往左。其实此属性本质上是决定可滚动组件的初始滚动位置。
- primary：指是否使用 widget 树中默认的 PrimaryScrollController；当滑动方向为垂直方向并且没有指定 controller 时，primary 默认为 true。
- padding：内边距

#### 应用

1. 配合 Column 使用，处理空间不足的情况，例如：考虑适配小屏设备、横屏模式或小窗模式。
2. ...

### [CustomScrollView](https://api.flutter.dev/flutter/widgets/CustomScrollView-class.html)

> CustomScrollView 是可以使用 Sliver 来自定义滚动模型（效果）的组件。它可以包含多种滚动模型，举个例子，假设有一个页面，顶部需要一个 GridView，底部需要一个 ListView，而要求整个页面的滑动效果是统一的，即它们看起来是一个整体。如果使用 GridView + ListView 来实现的话，就不能保证一致的滑动效果，因为它们的滚动效果是分离的，所以这时就需要一个"胶水"，把这些彼此独立的可滚动组件"粘"起来，而 CustomScrollView 的功能就相当于“胶水”。
>
> 在 Flutter 中，Sliver 通常指可滚动组件子元素（就像一个个薄片一样）。但是在 CustomScrollView 中，需要粘起来的可滚动组件就是 CustomScrollView 的 Sliver了，如果直接将 ListView、GridView 作为 CustomScrollView是 不行的，因为它们本身是可滚动组件而并不是 Sliver！因此，为了能让可滚动组件能和 CustomScrollView 配合使用，Flutter 提供了一些可滚动组件的 Sliver 版，如 SliverList、SliverGrid 等。实际上 Sliver 版的可滚动组件和非 Sliver 版的可滚动组件最大的区别就是前者不包含滚动模型（自身不能再滚动），而后者包含滚动模型 ，也正因如此，CustomScrollView 才可以将多个 Sliver "粘"在一起，这些 Sliver 共用 CustomScrollView 的 Scrollable，所以最终才实现了统一的滑动效果。

![custom_scroll_view.mindmap.jpg](./custom_scroll_view.mindmap.jpg)

API

- [CustomScrollView](https://api.flutter-io.cn/flutter/widgets/CustomScrollView-class.html)：滚动容器组件
- [SliverAppBar](https://api.flutter.dev/flutter/material/SliverAppBar-class.html)：导航栏
- [SliverToBoxAdapter](https://api.flutter.dev/flutter/widgets/SliverToBoxAdapter-class.html)
- [SliverList](https://api.flutter.dev/flutter/widgets/SliverList-class.html)：列表
- [SliverFixedExtentList](https://api.flutter.dev/flutter/widgets/SliverFixedExtentList-class.html)：固定高度的列表
- [SliverGrid](https://api.flutter.dev/flutter/widgets/SliverGrid-class.html)：网格
- [SliverPadding](https://api.flutter.dev/flutter/widgets/SliverPadding-class.html)：设置子元素的内边距
- [SliverOpacity](https://api.flutter.dev/flutter/widgets/SliverOpacity-class.html)
- [SliverSafeArea](https://api.flutter.dev/flutter/widgets/SliverSafeArea-class.html)

参考文献

- [CustomScrollView of 《Flutter 实战》](https://book.flutterchina.club/chapter6/custom_scrollview.html)
- [Place a floating app bar above a list](https://flutter.dev/docs/cookbook/lists/floating-app-bar)
- [Slivers](https://flutter.dev/docs/development/ui/advanced/slivers)
- [Slivers, Demystified](https://medium.com/flutter/slivers-demystified-6ff68ab0296f)
- [Slivers Explained - Making Dynamic Layouts (The Boring Flutter Development Show, Ep. 12)](https://www.youtube.com/watch?v=Mz3kHQxBjGg)
- [CustomScrollView in Flutter 实战](https://book.flutterchina.club/chapter6/custom_scrollview.html)
- [Flutter：Slivers大家族，让滑动视图的组合变得很简单！](https://juejin.im/post/5bceb534e51d457aa4596f9a#heading-5)
- [Slivers, Demystified](https://medium.com/flutter/slivers-demystified-6ff68ab0296f)
- [Decode CustomScrollView](https://medium.com/@greg.perry/decode-customscrollview-d5a60fcfb9fb)

#### [SliverAppBar](https://api.flutter.dev/flutter/material/SliverAppBar-class.html)

- `floating` + `pinned` + `snap`：滚动联动效果

    - `floating`：浮动显示 —— 下拉滚动隐藏，上拉滚动显示
    - `pinned`：固定显示 —— 下拉或上拉滚动都会显示
    - `snap`：扩展内容是否自动展开，float 必须为 true 时才可以设置

    用法

    - 不浮动不固定：`floating: false, pinned: false, snap: false`
    - 浮动显示：`floating: true, pinned: false, snap: false`
    - 固定显示：`floating: false, pinned: true, snap: false`

        固定显示的是否设置 `floating` 为 `true` 可以控制 `flexibleSpace` 在上拉时显示出来，否则要滚动最顶部才会出现

- `flexibleSpace` + `expandedHeight`：折叠收缩区域

    - 配合 FlexibleSpace 可以实现带背景图和标题铁底，并随着上推收缩高度和字体大小，直至标题显示再导航栏上
    - 也可以设置其他类型的组件，高度随着上推和下拉滚动而变化

- `bottom`：底栏，通常配合 Tabbar

### TODO

- [可滚动组件简介](https://book.flutterchina.club/chapter6/intro.html)
- [ListView](https://book.flutterchina.club/chapter6/listview.html)
- [GridView](https://book.flutterchina.club/chapter6/gridview.html)

## 滚动监听

- [滚动监听及控制](https://book.flutterchina.club/chapter6/scroll_controller.html)

### 用法

- initialScrollOffset：设置初始化滚动位置 —— `ScrollController(initialScrollOffset: 100)`
- keepScrollOffset：是否保存滚动位置，如果设置为 true 且配置了 PageStorageKey，那么即使滚动组件销毁再重建也可以恢复滚动位置

    ps：一个路由中包含多个可滚动组件时，如果要分别跟踪它们的滚动位置，并非一定就得给他们分别提供 PageStorageKey。这是因为 Scrollable 本身是一个 StatefulWidget，它的状态中也会保存当前滚动位置，所以，只要可滚动组件本身没有被从树上 detach 掉，那么其 State 就不会销毁(dispose)，滚动位置就不会丢失。只有当 Widget 发生结构变化，导致可滚动组件的 State 销毁或重新构建时才会丢失状态，这种情况就需要显式指定 PageStorageKey，通过 PageStorage 来存储滚动位置，一个典型的场景是在使用 TabBarView 时，在 Tab 发生切换时，Tab 页中的可滚动组件的 State 就会销毁，这时如果想恢复滚动位置就需要指定 PageStorageKey。

- jumpTo：滚动到指定位置
- animateTo：带动画地滚动到指定位置
- addListener：滚动监听，在滚动位置变化时触发调用回调函数
- offset：获取当前滚动偏移量，通常在 addEventListener 回调函数里访问
- positions：一个 ScrollController 对象可以同时被多个可滚动组件使用，ScrollController会为每一个可滚动组件创建一个 ScrollPosition 对象，这些 ScrollPosition 保存在 ScrollController 的 positions 属性中（List<ScrollPosition>）。ScrollPosition是真正保存滑动位置信息的对象，offset只是一个便捷属性：`double get offset => position.pixels;`。

    ps：一个 ScrollController 虽然可以对应多个可滚动组件，但是有一些操作，如读取滚动位置offset，则需要一对一！但是我们仍然可以在一对多的情况下，通过其它方法读取滚动位置，举个例子，假设一个 ScrollController 同时被两个可滚动组件使用，那么我们可以通过如下方式分别读取他们的滚动位置：

    ```dart
    // ...
    controller.positions.elementAt(0).pixels
    controller.positions.elementAt(1).pixels
    // ...
    ```

    我们可以通过 controller.positions.length 来确定 controller 被几个可滚动组件使用。

### 原理

当 ScrollController 和可滚动组件关联时，可滚动组件首先会调用 ScrollController 的 createScrollPosition() 方法来创建一个 ScrollPosition 来存储滚动位置信息，接着，可滚动组件会调用 attach() 方法，将创建的 ScrollPosition 添加到 ScrollController 的 positions 属性中，这一步称为“注册位置”，只有注册后 animateTo() 和 jumpTo() 才可以被调用。

当可滚动组件销毁时，会调用 ScrollController 的 detach() 方法，将其 ScrollPosition 对象从 ScrollController 的 positions 属性中移除，这一步称为“注销位置”，注销后 animateTo() 和 jumpTo() 将不能再被调用。

需要注意的是，ScrollController的animateTo() 和 jumpTo() 内部会调用所有 ScrollPosition 的 animateTo() 和 jumpTo()，以实现所有和该 ScrollController 关联的可滚动组件都滚动到指定的位置。

### 应用

1. 置顶按钮
2. 加载更多

## 参考文献

- [Scrolling widgets](https://flutter.dev/docs/development/ui/widgets/scrolling)

## TODO

- [LayoutBuilder](https://api.flutter.dev/flutter/widgets/LayoutBuilder-class.html)
- [IntrinsicHeight](https://api.flutter.dev/flutter/widgets/IntrinsicHeight-class.html)
- [Notification](https://api.flutter.dev/flutter/widgets/Notification-class.html) / [NotificationListener](https://api.flutter.dev/flutter/widgets/NotificationListener-class.html) / [ScrollNotification](https://api.flutter.dev/flutter/widgets/ScrollNotification-class.html)
