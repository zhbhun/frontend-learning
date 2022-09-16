# Changelog

- https://github.com/react-native-community/react-native-releases/blob/master/CHANGELOG.md

## [0.70](https://reactnative.dev/blog/2022/09/05/version-070)

- 文档更新“新的架构“部分；
- 使用 Hermes 作为默认引擎；
- 统一配置 iOS 和 Android 的 Codegen Config；
- 在新架构下 Android 支持库的 Auto-linking ；
- Android 构建时支持 CMake；
- ...

## 0.59

- Deprecated MaskedViewIOS as it has now been moved to react-native-community/masked-view
- Deprecated ViewPagerAndroid as it has now been moved to react-native-community/viewpager (77300ca by @ferrannp)
- Deprecated AsyncStorage as it has now been moved to react-native-community/asyncstorage
- Deprecated Slider as it has now been moved to react-native-community/slider
- Deprecated NetInfo as it has now been moved to react-native-community/netinfo
- Deprecated ImageStore and directed users to expo-file-system and react-native-fs
- AlertIOS is now replaced with Alert
- Remove the deprecated TabBarIOS 

## 0.58

...

## 0.57

- New features

    - Android 支持 `overflow`
    - iOS Webview 支持 `WKWebView`

## 0.56

- Breaking changes

    - 使用了 babel7， 需要升级 babel-preset-react-native 至 5.0.2 以上版本

        [babel-bridge](https://github.com/babel/babel-bridge) 可以用来兼容一些没有升级至 Babel 7 的第三方库

    - 开发环境必须使用 Node 8 以上版本
    - iOS 9 是最低的版本要求，同理 XCode 9 是最低的版本要求
    - Android 26 SDK 是最低的版本要求
    - WebView 默认只支持 http 或 https 地址（不支持 file://），并且默认禁用 Geolocation
    - View 嵌套在 Text 内部会抛出错误
    - 简化 requireNativeComponent 的用法
    - Image 不再暴露 ImageResizeMode
    - 一些未解决的问题

        - https://github.com/facebook/react-native/issues/19827
        - https://github.com/facebook/react-native/issues/19763
        - https://github.com/facebook/react-native/issues/19859
        - https://github.com/facebook/react-native/issues/19955

## 0.55

- Breaking changes

    - React Native 支持 Android TV
    - `TextInput` 支持 `contextMenuHidden`
    - `Text` 和 `TextInput` 支持 `letterSpacing`

- Reference

    - [0.55](https://github.com/react-native-community/react-native-releases/blob/master/CHANGELOG.md#055)

## 0.54

- Breaking changes

    - 支持动态加载第三方依赖
    - 新增 `invertStickyHeaders` 支持反向列表的粘性头部
    - `justifyContent` 支持 ` space-evenly`

- Reference

    - [0.54.0](https://github.com/facebook/react-native/releases/tag/v0.54.0)

## 0.53

- Breaking changes

    - `Keyboard` 事件包含 `easing` 和 `duration`
    - `ScrollView` 支持 `snapToInterval`
    - `TextInput` 支持 `onKeyPress`
    - `TextInput` 不再支持属性 `autoGrow`

- Reference

    - [0.53.0](https://github.com/facebook/react-native/releases/tag/v0.53.0)

## 0.52

- Breaking changes

    - `DatePickerIOS` 支持本地化
    - `CameraRoll` 支持 `deletePhotos`
    - 新增 `PlatformOS`
    - 废弃 `console.ignoredYellowBox = [...]`，推荐使用 `YellowBox.ignoreWarnings([...])`
    - React 升级至 `16.2.0`
    - `react-devtools-core` 升级至 `3.0.0`
    - `TouchableHighlight` 有默认的 `delayPressOut`，值为 100

- Reference

    - [0.52.0](https://github.com/facebook/react-native/releases/tag/v0.52.0)

## 0.51

- Breaking changes

    - 一些新的样式规则：`padding(Start|End)`，`margin(Start|End)`，`border(Top|Bottom)(Start|End)(Width|Color)`

- Reference

    - [0.51.0](https://github.com/facebook/react-native/releases/tag/v0.51.0)

## 0.50

- Breaking changes

    - `Image` 不再支持嵌套内容

- Reference

    - [0.50](https://github.com/facebook/react-native/releases/tag/v0.50.0)

## 0.49

- Breaking changes

    - 新项目只有一个入口文件

- Reference

    - [0.49.0](https://github.com/facebook/react-native/releases/tag/v0.49.0)

## 0.48

- Breaking changes

    - 废弃 `AdSupportIOS`

- Reference

    - [0.48.4](https://github.com/facebook/react-native/releases/tag/v0.48.4)

## 0.47

- Reference

    - [0.47.2](https://github.com/facebook/react-native/releases/tag/v0.47.2)

## 0.46

- Breaking changes

    - `TextInput` 的 `onChange` 事件不再提供属性 `contentSize`
    - `Image` 不允许包含子元素，否则会出现警告

- Reference

    - [0.46.4](https://github.com/facebook/react-native/releases/tag/v0.46.4)

## 0.45

- Breaking changes

    - 不再支持从 `react-native` 引入模块 `react`。

- Reference

    - [0.45.1](https://github.com/facebook/react-native/releases/tag/v0.45.1)

## 0.44

- Breaking changes

    - 不再支持 `@provides`，需要使用 `@providesModule`。
    - 废弃 `Navigator`，推荐使用 [React Navigation](https://reactnavigation.org/)。一定要使用的话，需要安装 [react-native-deprecated-custom-components](https://yarnpkg.com/en/package/react-native-deprecated-custom-components)
    - 废弃 `MapViewIOS`，推荐使用 [react-native-maps](https://github.com/airbnb/react-native-maps)。一定要使用的话，需要安装 [react-native-deprecated-modules](https://github.com/facebookarchive/react-native-deprecated-modules)。

- Reference

    - [0.44.3](https://github.com/facebook/react-native/releases/tag/v0.44.3)

## 0.43

- [0.43.4](https://github.com/facebook/react-native/releases/tag/v0.43.4)

## 0.42

- [0.42.3](https://github.com/facebook/react-native/releases/tag/v0.42.3)
