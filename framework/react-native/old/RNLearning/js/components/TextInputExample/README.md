# 常见问题
- [[TextInput] Added support for textAlign to TextInput](https://github.com/facebook/react-native/pull/772)
- [text Align :'right' doesn't work for placeholder when multiline is true](https://github.com/facebook/react-native/issues/7378)
- 怎么实现键盘弹出时将输入款放在键盘上方？

    1. 方案一：[react-native-keyboard-spacer](https://github.com/Andr3wHur5t/react-native-keyboard-spacer)

        存在缺点，会压缩上方的内容，并且输入框不是精准的定位再键盘上方，适用于被压缩内容为可伸缩的图片

    2. 方案二？
        - [How to auto-slide the window out from behind keyboard when TextInput has focus?](http://stackoverflow.com/questions/29313244/how-to-auto-slide-the-window-out-from-behind-keyboard-when-textinput-has-focus)
        - [react-native-keyboard-aware-scroll-view](https://github.com/APSL/react-native-keyboard-aware-scroll-view)
        - [TextInput被键盘遮挡 怎么解决这个问题](http://bbs.reactnative.cn/topic/606/textinput%E8%A2%AB%E9%94%AE%E7%9B%98%E9%81%AE%E6%8C%A1-%E6%80%8E%E4%B9%88%E8%A7%A3%E5%86%B3%E8%BF%99%E4%B8%AA%E9%97%AE%E9%A2%98/2)
        - http://kpetrovi.ch/2015/09/30/react-native-ios-keyboard-events.html

    [react-native里TextInput遇到的一些问题及解决方案](https://segmentfault.com/a/1190000003876625)
