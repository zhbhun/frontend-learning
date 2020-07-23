键盘的显隐藏控制。

# API
滚动视图与键盘相关的配置属性如下所示：

- keyboardDismissMode

     - 'none' (the default), drags do not dismiss the keyboard.
     - 'on-drag', the keyboard is dismissed when a drag begins.
     - 'interactive', the keyboard is dismissed interactively with the drag and moves in synchrony with the touch; dragging upwards cancels the dismissal. On android this is not supported and it will have the same behavior as 'none'.

- keyboardShouldPersistTaps

    - 'never' (the default), tapping outside of the focused text input when the keyboard is up dismisses the keyboard. When this happens, children won't receive the tap.
    - 'always', the keyboard will not dismiss automatically, and the scroll view will not catch taps, but children of the scroll view can catch taps.
    - 'handled', the keyboard will not dismiss automatically when the tap was handled by a children, (or captured by an ancestor).

# 应用场景
1. ScrollView 的输入框保持焦点

    - keyboardDismissMode: none
    - keyboardShouldPersistTaps: always

2. ScrollView 的输入框在滚动时保持焦点，点击时失去焦点

    TODO

3. ScrollView 的输入框在任何位置点击后，都要失去焦点

    - keyboardDismissMode: none
    - keyboardShouldPersistTaps: never

# 实际应用
- 直播：拖动聊天列表时不隐藏键盘，否则隐藏键盘
- ...

# 参考文献
- [Is there a way to keep the keyboard open even when input loses focus/prevent blur](https://github.com/facebook/react-native/issues/4229)
