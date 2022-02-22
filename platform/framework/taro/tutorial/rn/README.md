# React Native

## 存在问题

### 样式兼容问题

> React Native 的样式基于开源的跨平台布局引擎 Yoga ，样式基本上是实现了 CSS 的一个子集，并且属性名不完全一致。

1. React Native 中使用 Flexbox 规则来指定某个组件的子元素的布局，样式布局只能采用 Flex 布局，且默认值存在差异。
2. React Native 对 box-shadow 支持的不好（仅 iOS 有限支持成都有限）。
3. React Native 不支持线性渐变样式（需要使用定制的原生组件支持）。
4. React Native 不完全支持 CSS 属性简写，例如：React Native 只支持 backgroundColor。
5. React Native 不支持设置不同方向的边框样式，且边框样式只支持线条，不支持虚线和点。
6. React Native 不支持 background-image，需要以组件的形式实现。
7. Taro 使用的 CSS 选择器只能使用类选择，不能使用关系、伪类和伪元素选择器。
8. React Native 不支持固定位置定位（fixed）。
9. React Native 不支持 CSS 动画，需要使用的组件实现。
10. React Native 文字要包在 Text 组件里。

### 其他

- 原生层需要集成 `taro-native-shell`，底层集成了 expo。

## 参考文献

- [注意事项](https://nervjs.github.io/taro/docs/2.2.11/before-dev-remind#react-native)
- [React Native 端开发流程](https://nervjs.github.io/taro/docs/react-native) / [React Native 端开发流程（V2）](https://nervjs.github.io/taro/docs/2.2.11/react-native)
- [taro-yanxuan](https://github.com/qit-team/taro-yanxuan) / [Taro 多端开发的正确姿势：打造三端统一的网易严选（小程序、H5、React Native）](https://juejin.im/post/6844903779154804744)

    > http://cdn.jsnewbee.com/files/%E5%A4%9A%E7%AB%AF%E7%BB%9F%E4%B8%80%E5%BC%80%E5%8F%91%E5%AE%9E%E8%B7%B5.pdf
