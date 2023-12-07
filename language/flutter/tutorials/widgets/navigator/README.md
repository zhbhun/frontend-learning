# Navigator

## 原理

- 导航容器：管理路由栈的组件,用于推入、弹出路由页面。

  - [Navigator](https://api.flutter.dev/flutter/widgets/Navigator-class.html)
  - [WidgetsApp](https://api.flutter.dev/flutter/widgets/WidgetsApp-class.html)
  - [MaterialApp](https://api.flutter.dev/flutter/material/MaterialApp-class.html)
  - [CupertinoApp](https://api.flutter.dev/flutter/cupertino/CupertinoApp-class.html)

- 页面路由：定义界面切换动画及过渡的路由对象，页面切换由 Navigator 管理，需要通过 PageRoute 实现。

  - [PageRoute](https://api.flutter.dev/flutter/widgets/PageRoute-class.html)
  - [PageRouteBuilder](https://api.flutter.dev/flutter/widgets/PageRouteBuilder-class.html)
  - [MaterialPageRoute](https://api.flutter.dev/flutter/material/MaterialPageRoute-class.html)
  - [CupertinoPageRoute](https://api.flutter.dev/flutter/cupertino/CupertinoPageRoute-class.html)

- 路由动画

  - [PageTransitionsTheme](https://api.flutter.dev/flutter/material/PageTransitionsTheme-class.html)
  - [PageTransitionsBuilder](https://api.flutter.dev/flutter/material/PageTransitionsBuilder-class.html)
  - [CupertinoPageTransitionsBuilder](https://api.flutter.dev/flutter/material/PageTransitionsBuilder-class.html)
  - [FadeUpwardsPageTransitionsBuilder](https://api.flutter.dev/flutter/material/FadeUpwardsPageTransitionsBuilder-class.html)
  - [OpenUpwardsPageTransitionsBuilder](https://api.flutter.dev/flutter/material/OpenUpwardsPageTransitionsBuilder-class.html)
  - [ZoomPageTransitionsBuilder](https://api.flutter.dev/flutter/material/PageTransitionsBuilder-class.html)
  - [CupertinoPageTransition](https://api.flutter.dev/flutter/cupertino/CupertinoPageTransition-class.html)

- 页面设置：管理路由的名称和传参

  - [RouteSettings](https://api.flutter.dev/flutter/widgets/RouteSettings-class.html)
  - [Page](https://api.flutter.dev/flutter/widgets/Page-class.html)
  - [CupertinoPage](https://api.flutter.dev/flutter/cupertino/CupertinoPage-class.html)
  - [MaterialPage](https://api.flutter.dev/flutter/material/MaterialPage-class.html)

- 页面框架：实现基本页面脚手架的 widget，内含 AppBar、Drawer 等组件

  - [Scaffold](https://api.flutter.dev/flutter/material/Scaffold-class.html)
  - [CupertinoPageScaffold](https://api.flutter.dev/flutter/cupertino/CupertinoApp-class.html)


## 使用

### 拦截

- [PopScope](https://api.flutter.dev/flutter/widgets/PopScope-class.html)
