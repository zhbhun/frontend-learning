# 原理

- [Flutter 核心原理](https://book.flutterchina.club/chapter14/)
- [Flutter渲染机制—UI线程](http://gityuan.com/2019/06/15/flutter_ui_draw/)
- [[译] Flutter，什么是 Widgets、RenderObjects 和 Elements？](https://juejin.im/post/5b4c6054e51d4519475f1d5d#heading-7)
- [Flutter学习之视图体系](https://juejin.im/post/5c99ce54e51d455a3142aaa6#heading-15)
- [从源码开始了解Flutter绘制](http://www.flutterj.com/?post=162)
- [Flutter快速上车之Widget](https://zhuanlan.zhihu.com/p/43981599)
- [从源码了解Flutter的渲染基础：Widget/Element/RenderObject](https://blog.zhoulujue.com/Widget-Element-RenderObject/)
- [Flutter, what are Widgets, RenderObjects and Elements?](https://medium.com/flutter-community/flutter-what-are-widgets-renderobjects-and-elements-630a57d05208)
- [How to Create a Flutter Widget Using a RenderObject](https://nicksnettravels.builttoroam.com/create-a-flutter-widget/)
- [深入了解Flutter界面开发（强烈推荐）](https://zhuanlan.zhihu.com/p/36577285)
- [Flutter框架分析（三）-- Widget，Element和RenderObject](https://juejin.im/post/5c80efde5188251b8a53b306)
- [深入理解 Flutter 中的 Widget， Element， RenderObject](http://rannie.bitcron.com/post/flutter/2019-07-14-flutter-ui-system)

## [RenderObjectWidget](https://api.flutter.dev/flutter/widgets/RenderObjectWidget-class.html)

`RenderObjectWidget` 为 `RenderObjectElement` 提供配置信息，封装了 `RenderObject`。

- `createElement() → RenderObjectElement`
- `createRenderObject(BuildContext context) → RenderObject`
- `didUnmountRenderObject(covariant RenderObject renderObject) → void`
- `updateRenderObject(BuildContext context, covariant RenderObject renderObject) → void`

### [SingleChildRenderObjectWidget](https://api.flutter.dev/flutter/widgets/RenderObjectWidget-class.html)

TODO

## 源码分析

### Opacity

- Object > Diagnosticable > DiagnosticableTree > Widget > RenderObjectWidget > SingleChildRenderObjectWidget > Opacity
- Object > Diagnosticable > DiagnosticableTree > Element > RenderObjectElement > SingleChildRenderObjectElement
- Object > AbstractNode > RenderObject > RenderBox > RenderProxyBox > RenderOpacity

- [Opacity({Key key, @required double opacity, bool alwaysIncludeSemantics: false, Widget child })](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/basic.dart#L210)
- [Opacity -> SingleChildRenderObjectWidget -> SingleChildRenderObjectElement createElement() => SingleChildRenderObjectElement(this)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/framework.dart#L1684)

    ```dart
    @override
      SingleChildRenderObjectElement createElement() => SingleChildRenderObjectElement(this);
    ```

- [SingleChildRenderObjectElement -> void mount(Element parent, dynamic newSlot)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/framework.dart#L5443)


    ```dart
    @override
    void mount(Element parent, dynamic newSlot) {
      super.mount(parent, newSlot); // super -> RenderObjectElement
      _child = updateChild(_child, widget.child, null);
    }
    ```

- [SingleChildRenderObjectElement -> RenderObjectElement -> void mount(Element parent, dynamic newSlot)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/framework.dart#L5050)

    ```dart
    @override
    void mount(Element parent, dynamic newSlot) {
      super.mount(parent, newSlot); // super -> Element
      _renderObject = widget.createRenderObject(this); // widget -> Opacity
      assert(() {
        _debugUpdateRenderObjectOwner();
        return true;
      }());
      assert(_slot == newSlot);
      attachRenderObject(newSlot);
      _dirty = false;
    }
    ```

- [SingleChildRenderObjectElement -> RenderObjectElement -> Element -> void mount(Element parent, dynamic newSlot)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/framework.dart#L3001)


    ````dart
    @mustCallSuper
    void mount(Element parent, dynamic newSlot) {
      assert(_debugLifecycleState == _ElementLifecycle.initial);
      assert(widget != null);
      assert(_parent == null);
      assert(parent == null || parent._debugLifecycleState == _ElementLifecycle.active);
      assert(slot == null);
      assert(depth == null);
      assert(!_active);
      _parent = parent;
      _slot = newSlot;
      _depth = _parent != null ? _parent.depth + 1 : 1;
      _active = true;
      if (parent != null) // Only assign ownership if the parent is non-null
        _owner = parent.owner;
      if (widget.key is GlobalKey) {
        final GlobalKey key = widget.key;
        key._register(this);
      }
      _updateInheritance();
      assert(() {
        _debugLifecycleState = _ElementLifecycle.active;
        return true;
      }());
    }
    ```
- [Opacity -> RenderOpacity createRenderObject(BuildContext context)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/basic.dart#L242)

    ```dart
    @override
    RenderOpacity createRenderObject(BuildContext context) {
      return RenderOpacity(
        opacity: opacity,
        alwaysIncludeSemantics: alwaysIncludeSemantics,
      );
    }
    ```

- [Opacity -> void updateRenderObject(BuildContext context, RenderOpacity renderObject)](https://github.com/flutter/flutter/blob/v1.12.13%2Bhotfix.6/packages/flutter/lib/src/widgets/basic.dart#L250)

    ```dart
    @override
    void updateRenderObject(BuildContext context, RenderOpacity renderObject) {
      renderObject
        ..opacity = opacity
        ..alwaysIncludeSemantics = alwaysIncludeSemantics;
    }
    ```

- [RenderOpacity -> set opacity(double value)]

    ```dart
    set opacity(double value) {
      assert(value != null);
      assert(value >= 0.0 && value <= 1.0);
      if (_opacity == value)
        return;
      final bool didNeedCompositing = alwaysNeedsCompositing;
      final bool wasVisible = _alpha != 0;
      _opacity = value;
      _alpha = ui.Color.getAlphaFromOpacity(_opacity);
      if (didNeedCompositing != alwaysNeedsCompositing)
        markNeedsCompositingBitsUpdate();
      markNeedsPaint();
      if (wasVisible != (_alpha != 0) && !alwaysIncludeSemantics)
        markNeedsSemanticsUpdate();
    }
    ```
