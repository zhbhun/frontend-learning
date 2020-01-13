Flutter

Flutter 是 Google 开源的 UI 工具包，帮助开发者通过一套代码库高效构建多平台精美应用，支持移动、Web、桌面和嵌入式平台。

常用地址

- 官网

    - https://flutter.dev/
    - https://flutter.cn/
- [API](https://api.flutter.dev/)
- 社区

    - [Flutter 中文网](https://flutterchina.club)
    - [Flutter 知乎](https://www.zhihu.com/topic/20172123/hot)
- [awesome-flutter](https://github.com/Solido/awesome-flutter)
-  https://medium.com/flutter


更新日志

- [Flutter 1.9正式发布！支持macOS Catalina，Flutter网页版并入主库](https://mp.weixin.qq.com/s?__biz=MzUxMzcxMzE5Ng==&mid=2247492470&idx=1&sn=6e5a7b3501efcca4f5f83a6dcfc5b4f6)

参考文献

- [Technical Overview](https://flutter.io/docs/resources/technical-overview)
- [开发跨平台app推荐React Native还是flutter？](https://www.zhihu.com/question/307298908)

## 安装使用

1. [安装教程](https://flutter.dev/docs/get-started/install)

    - [国内镜像](https://flutter.dev/community/china)
    - [升级版本](https://flutter.dev/docs/development/tools/sdk/upgrading#upgrading-the-flutter-sdk-and-packages)
    - [切换渠道](https://flutter.dev/docs/development/tools/sdk/upgrading#switching-flutter-channels)

        flutter 可以选择不同的渠道下载，目前支持：master、master、beta 和 stable。

        https://github.com/flutter/flutter/wiki/Flutter-build-release-channels

    - [切换版本](https://flutter.dev/docs/development/tools/sdk/upgrading#selecting-a-specific-version)

2. [配置编辑器](https://flutter.dev/docs/get-started/editor)

3. [初始化项目](https://flutter.dev/docs/get-started/test-drive?tab=terminal)

参考链接

- [Flutter SDK releases](https://flutter.dev/docs/development/tools/sdk/releases?tab=windows)
- [Flutter release notes](https://flutter.dev/docs/development/tools/sdk/release-notes)

## 开发入门

- Migration
    - [Flutter for React Native developers](https://flutter.dev/docs/get-started/flutter-for/react-native-devs)
    - [Flutter for web developers](https://flutter.dev/docs/get-started/flutter-for/web-devs)
    - [Flutter for Android developers](https://flutter.dev/docs/get-started/flutter-for/android-devs)
    - [Flutter for iOS developers](https://flutter.dev/docs/get-started/flutter-for/ios-devs)
    - [Flutter for Xamarin.Forms developers](https://flutter.dev/docs/get-started/flutter-for/xamarin-forms-devs)
    - [Introduction to declarative UI](https://flutter.dev/docs/get-started/flutter-for/declarative)
- 专栏 & 博客

	- [闲鱼技术](https://www.zhihu.com/org/xian-yu-ji-zhu/activities)
	- [Flutter干货学堂](https://zhuanlan.zhihu.com/p/51750415)
	- [Flutter 实战](https://book.flutterchina.club/)
	- [Vadaski](https://juejin.im/user/5b5d45f4e51d453526175c06/posts)
- 视频
    - [Flutter  Channel on YouTube](https://www.youtube.com/channel/UCwXdFgeE9KYzlDdR7TG9cMw)
    - [Flutter in Focus](https://www.youtube.com/playlist?list=PLjxrf2q8roU2HdJQDjJzOeO6J3FoFLWr2)
    - [Flutter Widget of the Week](https://www.youtube.com/playlist?list=PLjxrf2q8roU23XGwz3Km7sQZFTdB996iG)
- 教程
    - [Zero to One with Flutter](https://medium.com/flutter/zero-to-one-with-flutter-43b13fd7b354)
    - [Zero to One with Flutter, Part Two](https://medium.com/flutter/zero-to-one-with-flutter-part-two-5aa2f06655cb)

### 组件开发

- [Flutter Widget Livebook](https://flutter-widget.live/)

#### 认识组件

- 有状态 vs 无状态
- 生命周期

参考文献

- [Adding interactivity to your Flutter app](https://flutter.dev/docs/development/ui/interactive)
- [Flutter | 深入浅出Key](https://juejin.im/post/5ca2152f6fb9a05e1a7a9a26)

##### 生命周期

- 初始化：constructor >> initState >> didChangeDependencies \>> build
- 属性变化：didUpdateWidget >> build
- 依赖变化：didChangeDependencies >> build
- 状态变化：setState >> build
- 销毁：deactivate >> dispose

参考文献

- [详解 Flutter 生命周期](https://zhuanlan.zhihu.com/p/55969418)
- [Stateful Widget Lifecycle](https://flutterbyexample.com/stateful-widget-lifecycle/)
- [How to check if Widget has mounted in flutter](https://stackoverflow.com/questions/54501245/how-to-check-if-widget-has-mounted-in-flutter)

问题思考

- 为什么没有挂载回调

    例如 RefreshIndicator 需要再挂载后调用 show 方法来显示初始化的加载动画

#### 基础组件

- [Text]( https://api.flutter.dev/flutter/widgets/Text-class.html)
  - [MASTERING STYLED TEXT IN FLUTTER](https://pusher.com/tutorials/styled-text-flutter)
  - [Flutter widgets 02 | Text](https://medium.com/flutteropen/flutter-widgets-02-text-6a7007d14798)
  - [Flutter Text Rendering](https://www.raywenderlich.com/4562681-flutter-text-rendering)
  - [Beginners Guide To Text Styling in Flutter](https://medium.com/flutter-community/beginners-guide-to-text-styling-in-flutter-3939085d6607)
  - [A Guide to Text Styling in Flutter](https://owenhalliday.co.uk/text-styling-flutter/)
  - [What is the StrutStyle in the Flutter Text widget](https://stackoverflow.com/questions/56799068/what-is-the-strutstyle-in-the-flutter-text-widget)
  - [Flutter: Text Widget](https://nicksnettravels.builttoroam.com/flutter-text-widget/)
  - [Flutter widgets 02 | Text](https://medium.com/flutteropen/flutter-widgets-02-text-6a7007d14798) / [Flutter widgets 02 | Text](https://medium.com/@niebin312/flutter-widgets-02-text-fd3cb43b2767)
- [Image](https://api.flutter.dev/flutter/widgets/Image-class.html)
  - [Display images from the internet](https://flutter.dev/docs/cookbook#images)
  - [Fade in images with a placeholder](https://flutter.dev/docs/cookbook/images/fading-in-images.html)
  - [Work with cached images](https://flutter.dev/docs/cookbook/images/cached-images.html)
  - [Loading images](https://flutter.dev/docs/development/ui/assets-and-images#loading-images)
  - [Flutter widgets 03 | Image](https://medium.com/flutteropen/flutter-widgets-03-image-558e2b24059e)
  - [Flutter widgets 03 | Image](https://medium.com/flutteropen/flutter-widgets-03-image-558e2b24059e)
- [Container](https://api.flutter.dev/flutter/widgets/Container-class.html)
  - [Flutter — Container Cheat Sheet](https://medium.com/jlouage/container-de5b0d3ad184)
  - [Flutter — BoxDecoration Cheat Sheet](https://medium.com/jlouage/flutter-boxdecoration-cheat-sheet-72cedaa1ba20)
  - [Flutter之Container用法详解](https://juejin.im/post/5c661d3ef265da2d943f4e5d)
  - [Container in Layout](https://flutter.dev/docs/development/ui/layout#container)
  - [Adding a border to a widget in Flutter](https://medium.com/@suragch/adding-a-border-to-a-widget-in-flutter-d387bc5d7cff)
  - [KNOW YOUR WIDGETS: CONTAINER IN FLUTTER](http://flutterdevs.com/blog/know-your-widgets-container-in-flutter/)
  - [Flutter Widgets 01 | Container](https://medium.com/flutteropen/flutter-widgets-01-container-cc76a2bfef11) / [Flutter Widgets 01 | Container](https://medium.com/@niebin312/flutter-widgets-01-container-42220b8e3463)

参考文献

- [Basic widgets](https://flutter.dev/docs/development/ui/widgets/basics)
- [Styling widgets](https://flutter.cn/docs/development/ui/widgets/styling)
- [Text widgets](https://flutter.cn/docs/development/ui/widgets/text)

#### 布局组件

- [Row](https://api.flutter.dev/flutter/widgets/Row-class.html) / [Column](https://api.flutter.dev/flutter/widgets/Column-class.html) / [Flexible](https://api.flutter.dev/flutter/widgets/Flexible-class.html) / [Expanded](https://api.flutter.dev/flutter/widgets/Expanded-class.html) / [SizedBox](https://api.flutter.dev/flutter/widgets/SizedBox-class.html) / [Spacer](https://api.flutter.dev/flutter/widgets/Spacer-class.html)
    - [Flutter — Row/Column Cheat Sheet](https://medium.com/jlouage/flutter-row-column-cheat-sheet-78c38d242041)
    - [Flutter Widgets 04 | Row & Column](https://medium.com/flutteropen/flutter-widgets-04-row-column-7a9d8062b472)
- [Stack](https://api.flutter.dev/flutter/widgets/Stack-class.html)  / [IndexedStack](https://api.flutter.dev/flutter/widgets/IndexedStack-class.html) / [Positioned](https://api.flutter.dev/flutter/widgets/Positioned-class.html)
  - [Stack in Layout](https://flutter.dev/docs/development/ui/layout#stack)
  - [Flutter Widgets 15 | Stack](https://medium.com/flutteropen/flutter-widgets-15-stack-9637858f7c62)
- [GridView](https://api.flutter.dev/flutter/widgets/GridView-class.html)
  - [GridView in Layout](https://flutter.dev/docs/development/ui/layout#gridview)
- [Wrap](https://api.flutter-io.cn/flutter/widgets/Wrap-class.html)
- [Align](https://api.flutter.dev/flutter/widgets/Align-class.html) / [Center](https://api.flutter.dev/flutter/widgets/Center-class.html) / [Baseline](https://api.flutter.dev/flutter/widgets/Baseline-class.html)
- [ConstrainedBox](https://api.flutter.dev/flutter/widgets/ConstrainedBox-class.html) / [CustomSingleChildLayout](https://api.flutter.dev/flutter/widgets/CustomSingleChildLayout-class.html) / [FittedBox](https://api.flutter.dev/flutter/widgets/FittedBox-class.html) / [FractionallySizedBox](https://api.flutter.dev/flutter/widgets/FractionallySizedBox-class.html) / [IntrinsicHeight](https://api.flutter.dev/flutter/widgets/IntrinsicHeight-class.html) / [OverflowBox](https://api.flutter.dev/flutter/widgets/OverflowBox-class.html) / [SizedOverflowBox](https://api.flutter.dev/flutter/widgets/SizedOverflowBox-class.html)
- [Padding](https://api.flutter.dev/flutter/widgets/Padding-class.html) / [Transform](https://api.flutter.dev/flutter/widgets/Transform-class.html)

参考文献

- [Layout widgets](https://flutter.dev/docs/development/ui/widgets/layout)
- [Basic Flutter layout concepts](https://flutter.dev/docs/codelabs/layout-basics)
- [Layouts in Flutter](https://flutter.dev/docs/development/ui/layout)
- [Tutorial](https://flutter.dev/docs/development/ui/layout/tutorial)
- [Dealing with box constraints](https://flutter.dev/docs/development/ui/layout/box-constraints)
- [Flutter 布局（五）- LimitedBox、Offstage、OverflowBox、SizedBox详解](https://juejin.im/post/5b52784ef265da0f521defa2)
- [Flutter 布局（六）- SizedOverflowBox、Transform、CustomSingleChildLayout详解](https://juejin.im/post/5b5927fee51d4517c564aaed)

#### 容器组件

##### 裁剪

- [ClipRect](https://api.flutter.dev/flutter/widgets/ClipRect-class.html)：剪裁子组件到实际占用的矩形大小（溢出部分剪裁）
- [ClipRRect](https://api.flutter.dev/flutter/widgets/ClipRRect-class.html)：将子组件剪裁为圆角矩形
- [ClipOval](https://api.flutter.dev/flutter/widgets/ClipOval-class.html)：子组件为正方形时剪裁为内贴圆形，为矩形时，剪裁为内贴椭圆
- [ClipPath](https://api.flutter.dev/flutter/widgets/ClipPath-class.html)：按路径裁剪子组件
    - [Clipping widgets with bezier curves in Flutter](https://iirokrankka.com/2017/09/04/clipping-widgets-with-bezier-curves-in-flutter/)
- [Flutter——路径裁剪](https://juejin.im/post/5d837928518825546f69f106)
  
- [Clip]( https://api.flutter.dev/flutter/dart-ui/Clip-class.html) / [CustomClipper](https://api.flutter.dev/flutter/rendering/CustomClipper-class.html)

参考文献

- [Flutter 实践 — 裁剪]( https://book.flutterchina.club/chapter5/clip.html )
- [Clipping in Flutter](https://medium.com/flutter-community/clipping-in-flutter-e9eaa6b1721a)
- [Flutter Clippers](https://medium.com/@mg55851/flutter-clippers-1fa3666f2bef)

#### 滚动组件

- [Scrolling widgets](https://flutter.cn/docs/development/ui/widgets/scrolling)
- [Create a grid list](https://flutter.dev/docs/cookbook/lists/grid-lists)
- [Create a horizontal list](https://flutter.dev/docs/cookbook/lists/horizontal-list.html)
- [Create lists with different types of items](https://flutter.dev/docs/cookbook/lists/mixed-list.html)
- [Place a floating app bar above a list](https://flutter.dev/docs/cookbook/lists/floating-app-bar.html)
- [Use lists](https://flutter.dev/docs/cookbook/lists/basic-list)
- [Work with long lists](https://flutter.dev/docs/cookbook/lists/long-lists)
- [Flutter 滚动控件篇-->GridView、CustomScrollView](https://juejin.im/post/5d981209e51d457838128c68)

##### API

- ListView
  - [ListView in Layout](https://flutter.dev/docs/development/ui/layout#listview)
- [SingleChildScrollView](https://api.flutter.dev/flutter/widgets/SingleChildScrollView-class.html)
- [RefreshIndicator](https://api.flutter.dev/flutter/material/RefreshIndicator-class.html) / [flutter_pulltorefresh](https://github.com/peng8350/flutter_pulltorefresh)
    - [RefreshIndicator, show without launch onRefresh](https://github.com/flutter/flutter/issues/40235)
    - [How to show RefreshIndicator intially while waiting data from backend API?](https://stackoverflow.com/questions/44031454/how-to-show-refreshindicator-intially-while-waiting-data-from-backend-api)
    - [Flutter 下拉刷新花式玩法](https://juejin.im/post/5bebcc44f265da61682aedb8)
- [CustomScrollView](https://api.flutter-io.cn/flutter/widgets/CustomScrollView-class.html) / [SliverToBoxAdapter](https://api.flutter.dev/flutter/widgets/SliverToBoxAdapter-class.html) / [SliverList](https://api.flutter.dev/flutter/widgets/SliverList-class.html) / [SliverGrid](https://api.flutter.dev/flutter/widgets/SliverGrid-class.html) / [SliverAppBar](https://api.flutter.dev/flutter/material/SliverAppBar-class.html)
    - [Slivers](https://flutter.dev/docs/development/ui/advanced/slivers)
    - [Slivers, Demystified](https://medium.com/flutter/slivers-demystified-6ff68ab0296f)
    - [Slivers Explained - Making Dynamic Layouts (The Boring Flutter Development Show, Ep. 12)](https://www.youtube.com/watch?v=Mz3kHQxBjGg)
    - [CustomScrollView in Flutter 实战](https://book.flutterchina.club/chapter6/custom_scrollview.html)
    - [Flutter：Slivers大家族，让滑动视图的组合变得很简单！](https://juejin.im/post/5bceb534e51d457aa4596f9a#heading-5)
    - [Slivers, Demystified](https://medium.com/flutter/slivers-demystified-6ff68ab0296f)
    - [Decode CustomScrollView](https://medium.com/@greg.perry/decode-customscrollview-d5a60fcfb9fb)
    - [Place a floating app bar above a list](https://flutter.dev/docs/cookbook/lists/floating-app-bar)
- [NestedScrollView](https://juejin.im/post/5beb91275188251d9e0c1d73) / [extended_nested_scroll_view](https://github.com/fluttercandies/extended_nested_scroll_view/blob/master/README-ZH.md)
    - [Flutter嵌套刷新填坑](http://blog.hacktons.cn/2019/11/25/refresh-with-nestscrollview/)
    - [Flutter 扩展NestedScrollView （一）Pinned头引起的bug解决](https://juejin.im/post/5bea43ade51d45544844010a)
    - [Flutter 扩展NestedScrollView （二）列表滚动同步解决](https://juejin.im/post/5bea90c6e51d450319791b2e)
    - [Flutter 扩展NestedScrollView （三）下拉刷新的解决](https://juejin.im/post/5beb91275188251d9e0c1d73)
    - [Flutter TabBar吸顶效果](https://www.jianshu.com/p/d96508c9d174)

##### 实现无限滚动

1. `ListView.builder` 不指定 itemCount，在 itemBuilder 的 index 接近当前数据集合尾部时，发起数据请求；
2. 使用 ScrollController 监听滚动位置来发起数据请求。

参考文献

- [Infinite List in Flutter Application](https://stackoverflow.com/questions/53114867/infinite-list-in-flutter-application)
- [Implement Infinite Scrolling in a ListView - Flutter](https://codinglatte.com/posts/flutter/listview-infinite-scrolling-in-flutter/)

#### 动画组件

- [Introduction to animations](https://flutter.dev/docs/development/ui/animations)
- [Animation and motion widgets](https://flutter.dev/docs/development/ui/widgets/animation)

参考文献

- [Animation 02 | Use the flare 2dimesion animation in the flutter?](https://medium.com/flutteropen/animation-02-use-the-flare-animation-in-the-flutter-5fa89dd74c54)
- [Animation 01 | How to use the animation in the flutter?](https://medium.com/flutteropen/animation-01-how-to-use-the-animation-in-the-flutter-e3ef7043f940) / [Animation 01 | How to use the animation in the flutter?](https://medium.com/@niebin312/animation-01-how-to-use-the-animation-in-the-flutter-4aded89396f9)

#### 路由组件

- [Navigation Cookbook](https://flutter.dev/docs/cookbook#navigation)
- [Navigation and routing](https://flutter.dev/docs/development/ui/navigation)
- [Flutter Widgets 12 | TabBarView&TabBar](https://medium.com/flutteropen/flutter-widgets-12-tabbarview-tabbar-4cdc2112991a)
- [Flutter Widgets 11 | BottomNavigationBar](https://medium.com/flutteropen/flutter-widgets-11-bottomnavigationbar-3531d625fa0c)

##### API

- [Navigator](https://api.flutter.dev/flutter/widgets/Navigator-class.html)
- [Route](https://api.flutter.dev/flutter/widgets/Route-class.html) / [OverlayRoute](https://api.flutter.dev/flutter/widgets/OverlayRoute-class.html) / [TransitionRoute](https://api.flutter.dev/flutter/widgets/TransitionRoute-class.html)/ [ModalRoute](https://api.flutter.dev/flutter/widgets/ModalRoute-class.html) / [PageRoute](https://api.flutter.dev/flutter/widgets/PageRoute-class.html) / [PopupRoute](https://api.flutter.dev/flutter/widgets/PopupRoute-class.html) / [CupertinoPageRoute](https://api.flutter.dev/flutter/cupertino/CupertinoPageRoute-class.html) / [MaterialPageRoute](https://api.flutter.dev/flutter/material/MaterialPageRoute-class.html) / [PageRouteBuilder](https://api.flutter.dev/flutter/widgets/PageRouteBuilder-class.html)
- [Drawer](https://api.flutter.dev/flutter/material/Drawer-class.html)
    - [Add a Drawer to a screen](https://flutter.dev/docs/cookbook/design/drawer)
- [RouteSettings](https://api.flutter.dev/flutter/widgets/RouteSettings-class.html)
- [MaterialApp](https://api.flutter.dev/flutter/material/MaterialApp-class.html) / [CupertinoApp](https://api.flutter.dev/flutter/cupertino/CupertinoApp-class.html)

##### 第三方

- [theyakka/fluro](https://pub.flutter-io.cn/packages/fluro)

#### 表单组件

- Form
- FormField
- CheckBox
- Radio
- Slider
- Switch
- TextField
- [CupertinoPicker](https://api.flutter.dev/flutter/cupertino/CupertinoPicker-class.html)
- [CupertinoDatePicker](https://api.flutter.dev/flutter/cupertino/CupertinoDatePicker-class.html) / [CupertinoTimerPicker](https://api.flutter.dev/flutter/cupertino/CupertinoTimerPicker-class.html)

参考文献

- [Input widgets](https://flutter.cn/docs/development/ui/widgets/input)

#### 反馈提示

##### API

- [showCupertinoModalPopup](https://api.flutter.dev/flutter/cupertino/showCupertinoModalPopup.html)

#### 交互手势

- [Adding interactivity to your Flutter app](https://flutter.dev/docs/development/ui/interactive)
- [Taps, drags, and other gestures](https://flutter.dev/docs/development/ui/advanced/gestures)
- [Interaction model widgets](https://flutter.cn/docs/development/ui/widgets/interaction)
- [Fluter Canvas tutorial 05 | Gesture with the custom painter?](https://medium.com/flutteropen/canvas-tutorial-05-how-to-use-the-gesture-with-the-custom-painter-in-the-flutter-3fc4c2deca06)

#### 平台组件

Material

- Card
  - [Card in Layout](https://flutter.dev/docs/development/ui/layout#card)
- ListTitle
  - [ListTitle in Layout](https://flutter.dev/docs/development/ui/layout#listtile)

Cupertino

- [Cupertino (iOS-style) widgets](https://flutter.dev/docs/development/ui/widgets/cupertino)
- [Material Components widgets](https://flutter.dev/docs/development/ui/widgets/material)

---

交互反馈

- [Flutter Widgets 18 | SnackBar](https://medium.com/flutteropen/flutter-widgets-18-snackbar-91972fe4d2ea)
- [Flutter Widgets 17 | SimpleDialog&AlertDialog](https://medium.com/flutteropen/flutter-widgets-17-simpledialog-1cf5bfd83f5f)

进度

- [https://medium.com/flutteropen/flutter-widgets-17-simpledialog-1cf5bfd83f5f](https://medium.com/flutteropen/flutter-widgets-16-stepper-485ad8d1a248)

---

- [Widgets 14 | PopupMenuButton](https://medium.com/flutteropen/widgets-14-popupmenubutton-1f1437bbdce2)
- [Flutter Widgets 13 | DropdownButton](https://medium.com/flutteropen/flutter-widgets-13-dropdownbutton-d21e9c226f04)
- [Flutter Widgets 10 | Placeholder](https://medium.com/flutteropen/flutter-widgets-10-placeholder-f8949a7dc273)
- [Flutter widgets 09 | FlutterLogo](https://medium.com/flutteropen/flutter-widgets-09-flutterlogo-5552b9021f8b)
- [Flutter Widgets 08 | Scaffold](https://medium.com/flutteropen/flutter-widgets-scaffold-8673c0630ed4)
- [Flutter Widgets 07 | AppBar](https://medium.com/flutteropen/flutter-widgets-07-appbar-86cae58244cd)
- [Flutter Widgets 06 | RaiseButton](https://medium.com/flutteropen/widgets-06-raisebutton-6322e0bb2a95)
- [Flutter Widgets 05 | Icon](https://medium.com/flutteropen/flutter-widgets-05-icon-7952665ecad)

### TODO

canvas

- [Canvas tutorial 04 | How to draw a pie chart and with a round angle in the flutter?](https://medium.com/flutteropen/canvas-tutorial-04-how-to-draw-a-pie-chart-and-with-a-round-angle-in-the-flutter-8a22126704f4)
- [Canvas tutorial 03 | How to draw a regular round angle polygon in the flutter?](https://medium.com/flutteropen/canvas-tutorial-03-how-to-draw-a-regular-round-angle-polygon-83b055b7af6c)
- [Canvas tutorial 02 | How to draw round angle polygon in the flutter?](https://medium.com/flutteropen/canvas-tutorial-02-how-to-draw-round-angle-polygon-in-the-flutter-7890e933cfb1)
- [Canvas tutorial 01 | How to use the canvas in the flutter?](https://medium.com/flutteropen/canvas-tutorial-01-how-to-use-the-canvas-in-the-flutter-8aade29ddc9)

### 资源管理

- [Adding assets and images](https://flutter.dev/docs/development/ui/assets-and-images)
- [Assets, images, and icon widgets](https://flutter.cn/docs/development/ui/widgets/assets)

### 网络连接

参考文献

- [JSON 和序列化数据](https://flutter.cn/docs/development/data-and-backend/json)
- [GraphQL with Flutter](https://medium.com/flutter-community/graphql-with-flutter-d974abcd2ccc)
- [Organizing a Token Authentication with a Splash using Flutter](https://medium.com/flutterpub/organizing-a-token-authentication-with-a-splash-using-flutter-dd6a510338dc)

### 本地存储

## 进阶开发

### 组件通信

- [[译] Flutter 核心概念详解： Widget、State、Context 及 InheritedWidget](https://juejin.im/post/5c768ad2f265da2dce1f535c#heading-17)

### 状态管理

[State management](https://flutter.dev/docs/development/data-and-backend/state-mgmt/intro)

setState

- [Flutter Architecture Samples](http://fluttersamples.com/)
-  https://medium.com/flutter/build-reactive-mobile-apps-in-flutter-companion-article-13950959e381

-  https://medium.com/@agungsurya/basic-state-management-in-google-flutter-6ee73608f96d

InheritedWidget & InheritedModel

- [Managing Flutter Application State With InheritedWidgets](https://medium.com/flutter/managing-flutter-application-state-with-inheritedwidgets-1140452befe1)
- [Inheriting Widgets](https://medium.com/@mehmetf_71205/inheriting-widgets-b7ac56dbbeb1)
- [Using Flutter Inherited Widgets Effectively](https://ericwindmill.com/articles/inherited_widget/)
- [Widget - State - Context - InheritedWidget](https://www.didierboelens.com/2018/06/widget---state---context---inheritedwidget/)

Provider & Scoped Model

- [You Might Not Need Redux: The Flutter Edition](https://proandroiddev.com/you-might-not-need-redux-the-flutter-edition-9c11eba006d7)
- [Managing State with the Scoped Model Pattern in Dart's Flutter Framework](https://www.youtube.com/watch?v=-MCeWP3rgI0)
- [Flutter: Inherited Widget & Scoped Model Explained | Part - 1](https://www.youtube.com/watch?v=j-27MZwRbFw)
- [Flutter State Management | Scoped Model](https://www.youtube.com/watch?v=Oql5bU-Uvso)
- [Flutter State Management | Scoped Model](https://www.youtube.com/watch?v=Oql5bU-Uvso)

Redux

- ...

BLoC / Rx

- [Why use RxDart and how we can use with BLoC Pattern in Flutter?](https://medium.com/flutter-community/why-use-rxdart-and-how-we-can-use-with-bloc-pattern-in-flutter-a64ca2c7c52d)

MobX

- ...

参考文献

- [Flutter | 状态管理指南篇——Provider](https://juejin.im/post/5d00a84fe51d455a2f22023f)
- [Flutter | 状态管理拓展篇——RxDart(四)](https://juejin.im/post/5bcea438e51d4536c65d2232)
- [Flutter | 状态管理探索篇——BLoC(三)](https://juejin.im/post/5bb6f344f265da0aa664d68a)
- [Flutter | 状态管理探索篇——Redux（二）](https://juejin.im/post/5ba26c086fb9a05ce57697da)
- [Flutter | 状态管理探索篇——Scoped Model（一）](https://juejin.im/post/5b97fa0d5188255c5546dcf8)

### 代码复用

hook

-  https://pub.dev/packages/flhooks 
- https://pub.dev/packages/flutter_hooks
- [flutter-hooks](https://zhuanlan.zhihu.com/p/58175634)

### 主题定制

- [ThemeData](https://api.flutter.dev/flutter/material/ThemeData/ThemeData.html)

---

- [Use themes to share colors and font styles](https://flutter.dev/docs/cookbook/design/themes)
- [Using Themes in Flutter](https://alligator.io/flutter/themes/)
- [Flutter Theme Class](https://flutterbyexample.com/flutter-theme-class/)
- [Flutter: Themes](https://medium.com/@mx_tino/flutter-themes-9cebc0fecd1d)
- [Flutter 样式基础之 Theme 主题](https://juejin.im/post/5d751714f265da03ad14765c)
- [Build a Theme Manager in Flutter](https://medium.com/flutter-community/build-a-theme-manager-in-flutter-3faeed26b8b3)
- [MDC-103 Flutter: Material Theming with Color, Shape, Elevation, and Type (Flutter)](https://codelabs.developers.google.com/codelabs/mdc-103-flutter/#0)
- [How to dynamically change the theme in Flutter ](https://proandroiddev.com/how-to-dynamically-change-the-theme-in-flutter-698bd022d0f0)
- [Flutter: Custom theme data](https://gist.github.com/mikemimik/5ac2fa98fe6d132098603c1bd40263d5)

### 原生能力

#### 应用状态

- [Flutter App Lifecycle](https://medium.com/pharos-production/flutter-app-lifecycle-4b0ab4a4211a)

### 跨平台开发

- [Binding to native code using dart:ffi](https://flutter.dev/docs/development/platform-integration/c-interop)
- [Web FAQ](https://flutter.dev/docs/development/platform-integration/web)
- [Writing custom platform-specific code](https://flutter.dev/docs/development/platform-integration/platform-channels)
- [Platform specific behaviors and adaptations](https://flutter.dev/docs/resources/platform-adaptations)
### 屏幕适配 / 响应式设计

- [Creating responsive apps](https://flutter.dev/docs/development/ui/layout/responsive)
- [flutter_screenutil](https://github.com/OpenFlutter/flutter_screenutil)

### 公共包开发

- [Using packages](https://flutter.dev/docs/development/packages-and-plugins/using-packages)

### 常用插件

- [flutter/plugins](https://github.com/flutter/plugins/tree/master/packages/url_launcher/url_launcher)

### 单元测试

### 国际化

- [Internation­alizing Flutter apps](https://flutter.dev/docs/development/accessibility-and-localization/internationalization)

### 无障碍

- [Accessibility](https://flutter.dev/docs/development/accessibility-and-localization/accessibility)

### 工作原理

- [深入理解flutter的编译原理与优化](https://mp.weixin.qq.com/s/vlHt8jxbdzBqJZDobpsFVw)
- [Background processes](https://flutter.dev/docs/development/packages-and-plugins/background-processes)

### 性能优化

- [Flutter | 性能优化——如何避免应用 jank](https://juejin.im/post/5da521426fb9a04e19505a08)

## 开发工具

### 格式化工具

- [Code formatting]( https://flutter.dev/docs/development/tools/formatting )

### 调试工具

- [Debugging](https://flutter.io/docs/get-started/flutter-for/react-native-devs#debugging)
- [Debugging Flutter apps](https://flutter.io/docs/testing/debugging)

参考文献

- [Debugging layout issues visually](https://flutter.dev/docs/development/tools/devtools/inspector#debugging-layout-issues-visually)
- [Using the Flutter inspector](https://flutter.dev/docs/development/tools/devtools/inspector)
- [Flutter — Debugging UI Cheat Sheet](https://medium.com/@louagejulien/flutter-debugging-ui-cheat-sheet-18a7b09dd468)

### 热加载

- [Hot reload](https://flutter.dev/docs/development/tools/hot-reload)

## 应用案例

- [Flutter Examples](https://github.com/flutter/flutter/blob/master/examples/README.md) - 官方源码示例
- [flutter/samples](https://github.com/flutter/samples/blob/master/INDEX.md) - 官方收集的社区示例
- [Cookbook](https://flutter.dev/docs/cookbook)
- [Codelabs](https://flutter.dev/docs/codelabs)
- [Tutorials](https://flutter.dev/docs/reference/tutorials)
- [Write your first Flutter app, part 1](https://flutter.dev/docs/get-started/codelab) / [Write Your First Flutter App, part 2](https://codelabs.developers.google.com/codelabs/first-flutter-app-pt2/#0)
- [flutter-go](https://github.com/alibaba/flutter-go)

### 启动界面

- [Flutter — Creating App Icons and Launch Screens for iOS](https://medium.com/jlouage/flutter-creating-app-icons-and-launch-screens-for-ios-df5fb98bd681)

## 常见问题

- 热更新

    - [Code Push / Hot Update / out of band updates](https://github.com/flutter/flutter/issues/14330)

## 参考文献

- [深入了解Flutter界面开发](https://zhuanlan.zhihu.com/p/36577285)
- [如何评价 Google 的 Fuchsia、Android、iOS 跨平台应用框架 Flutter？](https://www.zhihu.com/question/50156415)
- [演讲：基于Google Flutter的移动端跨平台应用实践](https://gmtc.geekbang.org/presentation/617)
- [Hummingbird: Building Flutter for the Web](https://medium.com/flutter-io/hummingbird-building-flutter-for-the-web-e687c2a023a8)
- [如何评价 Google 发布 Flutter 1.0 正式版？](https://www.zhihu.com/question/304696967/answer/550278042)
- https://mailchi.mp/5db146a7468b/flutter-weekly-11
- [字节跳动Flutter架构实践](https://mp.weixin.qq.com/s/7Ap-9MyhkveqGPRsRZWvyw)
