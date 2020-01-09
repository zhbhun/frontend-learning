# Tab

## API

- Material Tab Bar：顶部 tab 栏

    - Controller：控制器，[TabController](https://api.flutter.dev/flutter/material/TabController-class.html) 是 `ChangeNotifier` 的子类，用于管理 Tab 的 index 和 animation。
    - bar：tab 栏

    	- [TabBar](https://api.flutter.dev/flutter/material/TabBar-class.html)

	- [Tab](https://api.flutter.dev/flutter/material/Tab-class.html)
	- body：tab 主体

        - [TabBarView](https://api.flutter.dev/flutter/material/TabController-class.html)

- Material BottomNavigationBar：底部导航栏
- Cupertino Tabbar：[CupertinoTabBar](https://api.flutter.dev/flutter/cupertino/CupertinoTabBar-class.html) / [CupertinoTabScaffold](https://api.flutter.dev/flutter/cupertino/CupertinoTabScaffold-class.html) / [CupertinoTabView](https://api.flutter.dev/flutter/cupertino/CupertinoTabView-class.html)

## 教程

- [Work with tabs]( https://flutter.dev/docs/cookbook/design/tabs )
- [Flutter Widgets 11 | BottomNavigationBar](https://medium.com/flutteropen/flutter-widgets-11-bottomnavigationbar-3531d625fa0c)
- [Flutter Widgets 12 | TabBarView&TabBar](https://medium.com/flutteropen/flutter-widgets-12-tabbarview-tabbar-4cdc2112991a)
- [Flutter 三种方式实现页面切换后保持原页面状态](https://zhuanlan.zhihu.com/p/58582876)
- [Flutter: PageView/TabBarView等控件保存状态的问题解决方案](https://juejin.im/post/5b73c3b3f265da27d701473a)

## 应用

### Material Tab Bar

1. 在无状态组件里使用 [DefaultTabController](https://api.flutter.dev/flutter/material/DefaultTabController-class.html) 提供的 [TabController](https://api.flutter.dev/flutter/material/TabController-class.html)；
2. 在有状态组件里自己实例化管理 [TabController](https://api.flutter.dev/flutter/material/TabController-class.html)；
3. 使用 [TabController#animateTo](https://api.flutter.dev/flutter/material/TabController/animateTo.html) 手动控制 tab 切换；
4. TabView 子组件 `with AutomaticKeepAliveClientMixin` 可以实现 tab 切换时状态不丢失；
