键盘弹出时可能将部显示分区域遮挡住了。

# 问题
- View

    - Android：如果输入框会被键盘遮挡，则键盘弹出时会将**整个** View 往上顶
    - iOS：没有任何处理

- ScrollView

    - Android：如果输入框会被键盘遮挡，则键盘弹出时会滚动 ScrollView 的高度，直至输入框的底部与键盘顶部对齐（即使输入框下面还有部分区域需要显示，也会被遮挡）

        备注：水平滚动列表也同样存在该问题，但是切入后台再回来却不会。

    - iOS：没有任何处理

# 参考
- [Android中的windowSoftInputMode属性详解](http://www.jb51.net/article/56043.htm)

---

问题

- iOS：输入框获取焦点时，弹出的键盘会遮挡视图区域。

    疑问：是在上层遮挡，还是同层压缩了视图容器的高度导致的？

- Android：输入框获取焦点时，键盘区域会压缩视图高度（屏幕高度 - 键盘高度），不同的视图容器内处理情况不一样。

    - 在 ScrollVIew 上打开键盘时，会自动根据当前输入框是否被键盘挡住来滚动视图；
    - 在 View 上打开键盘时，视图内容略微上移，由于视图高度被压缩，超出视图的内容显示不出来；

解决方案

- 解决 View 组件的键盘遮挡问题

    使用场景

    类似雪球的登录界面（View），上半部分是图片，下半部分是登录表单。在表单输入框获取焦点时，键盘占据屏幕下半部分，并压缩上方的图片高度，以解决键盘遮挡输入框问题。

    实现方式

    - [react-native-keyboard-spacer](https://github.com/Andr3wHur5t/react-native-keyboard-spacer)
    - ...

- 解决 ScrollView 组件的键盘遮挡问题

    使用场景

    在 ScrollView / ListView 组件内部存在 TextInput 组件，要求输入框获取焦点时，视图容器自动调整滚动高度，确保输入框出现在键盘上方。

    实现方式：

    - [KeyboardAvoidingView](http://facebook.github.io/react-native/docs/keyboardavoidingview.html)

        React Native 提供的组件，但要求 react-native 版本大于等于 0.29

    - 使用 scrollView 组件实例的 API 实现

        ```javascript
        // Scroll a component into view. Just pass the component ref string.
        inputFocused (refName) {
            setTimeout(() => {
            let scrollResponder = this.refs.scrollView.getScrollResponder();
            scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
                React.findNodeHandle(this.refs[refName]),
                110, //additionalOffset
                true
            );
            }, 50);
        }
        render () {
            return (
            <ScrollView ref='scrollView'>
                <TextInput ref='username' 
                            onFocus={this.inputFocused.bind(this, 'username')}
            </ScrollView>
            )
        }
        ```

        备注：在 KeyboardAvoidingView 出现前的早起解决方案（不存在版本限制？）。

    - [react-native-keyboard-aware-scroll-view](https://github.com/APSL/react-native-keyboard-aware-scroll-view)：社区提供的一个解决方案

参考文献

- [How to auto-slide the window out from behind keyboard when TextInput has focus?](http://stackoverflow.com/questions/29313244/how-to-auto-slide-the-window-out-from-behind-keyboard-when-textinput-has-focus)
- https://segmentfault.com/a/1190000003876625
- http://blog.csdn.net/codetomylaw/article/details/52643031
- http://blog.csdn.net/syg90178aw/article/details/50986997
- http://www.cnblogs.com/pofabs/p/5109021.html
- http://stackoverflow.com/questions/29685421/react-native-hide-keyboard
- [KeyboardAvoidingView padding bug](https://github.com/facebook/react-native/issues/10517)
- [Bug in KeyboardAvoidingView on Android](https://github.com/facebook/react-native/issues/11681)
