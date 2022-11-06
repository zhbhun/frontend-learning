# 跨平台

**跨平台实现思路**

- Web：基于 Web 相关技术来实现界面及功能，例如：PhoneGap/Cordova；
- 代码转码：将某个语言转成 Objective-C、Java 或 C#，然后使用不同平台下的官方工具来开发，例如：j2objc，MyAppConverter，Sharpen，JUniversal，Haxe，XMLVM；
- 编译：将某个语言编译为二进制文件，生成动态库或打包成 apk/ipa/xap 文件，例如：C++,Xamarin，RoboVM，apportable，Go，Xojo；
- 虚拟机：通过将某个语言的虚拟机移植到不同平台上来运行，例如：Titanium，Hyperloop，NativeScript，React Native，Adobe AIR，Dart；

**不同编程语言提供的跨平台方案**

- JavaScript：React Native，Weex，NativeScript，Titanium，PhoneGap/Cordova
- Java：RoboVM，j2objc
- C#：Xamarin
- Objective-C：MyAppConverter
- C++：做游戏或非 UI 的公共部分

**跨平台方案点评**

- PhoneGap/Cordova

    存在问题：性能慢，API 缺失

    - CSS 过于灵活，计算成本搞，拖累了浏览器的性能 —— 有些方案通过避免编写 CSS 来解决该问题，例如 [Famo.us](http://famo.us/)；
    - DOM 是一个很上层的 API，无法做到像 Native 那样细粒度的控制内存及线程；
    - 早期浏览器实现比较差，没有进行优化 —— android 的浏览器比 iOS 性能差很多；

    解决方案：不使用 HTML/CSS

    - 使用 Canvas 来画界面，例如 [react-canvas](https://github.com/Flipboard/react-canvas)，但只能解决部分问题，而且存在较多其他的新问题；
    - 使用 WebGL，例如 [HTML-GL](https://github.com/PixelsCommander/HTML-GL)，但该方案还不成熟；

    实际应用：Web 最初的就是显示文档，如果想显示丰富的图文排版，虽然 iOS/Android 都有富文本组件，但比起 CSS 差太远了，所以在很多 Native 应用中是不可避免要嵌 Web 的。

- React Native

    TODO

**实际应用**

1. Only Native
2. Navive + Web
3. React Natvie

## 参考文献

- [聊聊移动端跨平台开发的各种技术](http://fex.baidu.com/blog/2015/05/cross-mobile/)
- [【深入解析】跨端框架的核心技术到底是什么？](https://supercodepower.com/cross-platform-tech)
