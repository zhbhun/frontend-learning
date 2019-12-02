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
- 视频
    - [Flutter  Channel on YouTube](https://www.youtube.com/channel/UCwXdFgeE9KYzlDdR7TG9cMw)
    - [Flutter in Focus](https://www.youtube.com/playlist?list=PLjxrf2q8roU2HdJQDjJzOeO6J3FoFLWr2)
    - [Flutter Widget of the Week](https://www.youtube.com/playlist?list=PLjxrf2q8roU23XGwz3Km7sQZFTdB996iG)
- 教程
    - [Zero to One with Flutter](https://medium.com/flutter/zero-to-one-with-flutter-43b13fd7b354)
    - [Zero to One with Flutter, Part Two](https://medium.com/flutter/zero-to-one-with-flutter-part-two-5aa2f06655cb)

### 组件开发

#### 基础组件

- [Text]( https://api.flutter.dev/flutter/widgets/Text-class.html)
- Image
- [Container](https://api.flutter.dev/flutter/widgets/Container-class.html)
  - [Flutter — Container Cheat Sheet](https://medium.com/jlouage/container-de5b0d3ad184)
  - [Flutter之Container用法详解](https://juejin.im/post/5c661d3ef265da2d943f4e5d)
  - [Container in Layout](https://flutter.dev/docs/development/ui/layout#container)

参考文献

- [Basic widgets](https://flutter.dev/docs/development/ui/widgets/basics)
- [Styling widgets](https://flutter.cn/docs/development/ui/widgets/styling)
- [Text widgets](https://flutter.cn/docs/development/ui/widgets/text)

#### 布局组件

- [Layout widgets](https://flutter.dev/docs/development/ui/widgets/layout)
- [Row](https://api.flutter.dev/flutter/widgets/Row-class.html)
- [Column](https://api.flutter.dev/flutter/widgets/Column-class.html)
- Stack
  - [Stack in Layout](https://flutter.dev/docs/development/ui/layout#stack)
- GridView
  - [GridView in Layout](https://flutter.dev/docs/development/ui/layout#gridview)

参考文献

- [Layouts in Flutter](https://flutter.dev/docs/development/ui/layout)
- [Tutorial](https://flutter.dev/docs/development/ui/layout/tutorial)
- [Dealing with box constraints](https://flutter.dev/docs/development/ui/layout/box-constraints)

#### 自定义组件

- 有状态 vs 无状态
- 生命周期

参考文献

- [Adding interactivity to your Flutter app](https://flutter.dev/docs/development/ui/interactive)

##### 生命周期

- 初始化：constructor >> initState >> didChangeDependencies \>> build
- 属性变化：didUpdateWidget >> build
- 依赖变化：didChangeDependencies >> build
- 状态变化：setState >> build
- 销毁：deactivate >> dispose

生命周期

- [详解 Flutter 生命周期](https://zhuanlan.zhihu.com/p/55969418)
- [Stateful Widget Lifecycle](https://flutterbyexample.com/stateful-widget-lifecycle/)

#### 路由组件

- [Navigation and routing](https://flutter.dev/docs/development/ui/navigation)

第三方

- [theyakka/fluro](https://pub.flutter-io.cn/packages/fluro)

#### 表单组件

- Form
- FormField
- CheckBox
- Radio
- Slider
- Switch
- TextField

参考文献

- [Input widgets](https://flutter.cn/docs/development/ui/widgets/input)

#### 交互手势

- [Adding interactivity to your Flutter app](https://flutter.dev/docs/development/ui/interactive)
- [Taps, drags, and other gestures](https://flutter.dev/docs/development/ui/advanced/gestures)
- [Interaction model widgets](https://flutter.cn/docs/development/ui/widgets/interaction)

#### 滚动组件

- ListView
  - [ListView in Layout](https://flutter.dev/docs/development/ui/layout#listview)

参考文献

- [Basic Flutter layout concepts](https://flutter.dev/docs/codelabs/layout-basics)
- [Layouts in Flutter](https://flutter.dev/docs/development/ui/layout)
- [Scrolling widgets](https://flutter.cn/docs/development/ui/widgets/scrolling)

#### 动画组件

- [Introduction to animations](https://flutter.dev/docs/development/ui/animations)
- [Animation and motion widgets](https://flutter.dev/docs/development/ui/widgets/animation)

#### 平台组件

Material

- Card
  - [Card in Layout](https://flutter.dev/docs/development/ui/layout#card)
- ListTitle
  - [ListTitle in Layout](https://flutter.dev/docs/development/ui/layout#listtile)

Cupertino

- [Cupertino (iOS-style) widgets](https://flutter.dev/docs/development/ui/widgets/cupertino)
- [Material Components widgets](https://flutter.dev/docs/development/ui/widgets/material)

### 资源管理

- [Adding assets and images](https://flutter.dev/docs/development/ui/assets-and-images)
- [Assets, images, and icon widgets](https://flutter.cn/docs/development/ui/widgets/assets)

### 网络连接

参考文献

- [JSON 和序列化数据](https://flutter.cn/docs/development/data-and-backend/json)
- 

### 本地存储

## 进阶开发

### 组件通信

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

- ...

MobX

- ...

### 主题定制

TODO

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

## 开发工具

### 格式化工具

- [Code formatting]( https://flutter.dev/docs/development/tools/formatting )

### 调试工具

- [Debugging](https://flutter.io/docs/get-started/flutter-for/react-native-devs#debugging)
- [Debugging Flutter apps](https://flutter.io/docs/testing/debugging)

参考文献

- [Debugging layout issues visually](https://flutter.dev/docs/development/tools/devtools/inspector#debugging-layout-issues-visually)
- [Using the Flutter inspector](https://flutter.dev/docs/development/tools/devtools/inspector)

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
