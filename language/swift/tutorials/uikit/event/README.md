# [Event](https://developer.apple.com/documentation/uikit/touches_presses_and_gestures)

## 要点


当涉及到 Swift UIKit 的事件处理时，以下是一个事件相关的知识大纲：

- 事件基础概念：

    - UIEvent（事件）：用户与应用程序交互的动作，如点击、滑动、拖拽等。
    - UIResponder（事件处理）：捕捉和响应用户的事件动作。
    - Responder Chain（响应者链）：处理事件的对象链，包括视图、窗口和应用程序对象。

- 触摸事件处理：

    - 触摸事件生命周期：按下（Touch Down）、移动（Touch Move）、抬起（Touch Up）等。
    - 触摸事件的响应者：UIView 及其子类对象作为触摸事件的响应者。
    - 重写触摸事件方法：touchesBegan(:with:), touchesMoved(:with:), touchesEnded(:with:), touchesCancelled(:with:)。

- 手势识别器（Gesture Recognizers）：

    - 手势识别器类：提供了在视图中识别和处理手势的机制，如 UITapGestureRecognizer、UIPinchGestureRecognizer、UISwipeGestureRecognizer 等。
    - 手势识别器的配置和使用：创建手势识别器实例、添加手势识别器到视图、配置手势识别器的属性、实现手势识别器的回调方法。

- 控件事件处理：

    - UIControl 事件：按钮点击事件、滑块值改变事件、分段控件的切换事件等。
    - UIControl 事件的回调方法：使用 addTarget(_:action:for:) 方法将回调方法与控件的事件关联。

- 键盘事件处理：

    - 键盘通知：UIKeyboardWillShowNotification、UIKeyboardWillHideNotification 等键盘相关的通知。
    - 键盘事件的处理：注册通知观察者、实现键盘通知的回调方法、调整界面以适应键盘的显示和隐藏。

- 指针交互事件处理：

    - 鼠标事件处理：NSResponder 类及其子类处理鼠标事件，例如 macOS 上的 AppKit。
    - 触控板事件处理：使用 NSGestureRecognizer 类处理触控板手势事件，例如 macOS 上的 AppKit。

- 事件的传递和响应者链：

    - 事件的传递顺序：UIKit 使用响应者链（Responder Chain）将事件从视图传递到视图层次结构中的其他对象。
    - 事件的传递方法：hitTest(_:with:), point(inside:with:), next, canBecomeFirstResponder() 等方法。

## 手势事件

- 按压：`UITapGestureRecognizer`
- 长按：`UILongPressGestureRecognizer`
- 悬浮：`UIHoverGestureRecognizer`

    - 鼠标
    - Apple Pencil

- 拖动：`UIPanGestureRecognizer`
- 轻扫：`UISwipeGestureRecognizer`
- 捏合：`UIPinchGestureRecognizer`
- 旋转：`UIRotationGestureRecognizer`
- 屏幕边缘识别拖动手势：`UIScreenEdgePanGestureRecognizer`

    ps：用于实现侧滑返回
