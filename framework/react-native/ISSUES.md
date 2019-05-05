- [React Native on StackOverflow](http://stackoverflow.com/questions/tagged/react-native)
- [React Native 六：使用源码构建React Native](http://blog.csdn.net/p106786860/article/details/51297447)

# 安装
## Error: Watcher took too long to load (WatchmanWatcher)

- 问题描述：启动 Package Server 后不能正确编译代码，提示 `(node:30920) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: Watcher took too long to load (WatchmanWatcher)`。
- 解决方案：

    1. 确定是否安装 Watchman；
    2. 尝试关闭 Watchman：`watchman shutdown-server`

- 参考文献

    - [ReactNative: Watcher took too long to load](https://facebook.github.io/watchman/docs/troubleshooting.html#reactnative-watcher-took-too-long-to-load)
    - [Error watchman took too long to load](https://github.com/facebook/react-native/issues/239)

## Waiting…Fatal error: watch ENOSPC
- [Grunt watch error - Waiting…Fatal error: watch ENOSPC](https://stackoverflow.com/questions/16748737/grunt-watch-error-waiting-fatal-error-watch-enospc)

## Error while uploading app-debug.apk : Unknown failure ([CDS]close[0])
- http://blog.csdn.net/woxueliuyun/article/details/54562126
- [Android Uiautomator2 gradlew 坑](http://www.cnblogs.com/zsr0401/p/6728189.html)

## New React Native project with old version of react native
- http://www.cnblogs.com/zsr0401/p/6728189.html
- https://stackoverflow.com/questions/34211131/new-react-native-project-with-old-version-of-react-native/37623531#37623531

## 如何去掉黄色的警告框
- [react-disable-and-ignore-yellow-box-warnings-in-react-native](https://egghead.io/lessons/react-disable-and-ignore-yellow-box-warnings-in-react-native)

## 如何在 React Native 启用 ES7 Decorator 特性？
- http://moduscreate.com/using-es2016-decorators-in-react-native/
- https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841

# 组件

## TextInput

- RN@0.55 不能输入中文

    - [ReactNative's state update via this.setState breaks text input mode for Korean, Chinese, Japanese characters in 0.54 and 0.55](https://github.com/facebook/react-native/issues/19339)

# API
## 如何禁用屏幕旋转
- [how to disable rotation in React Native?](https://stackoverflow.com/questions/32176548/how-to-disable-rotation-in-react-native)


## Dimension 返回错误的值

- [Dimensions.get('window').height is sometimes wrong on Android](https://github.com/facebook/react-native/issues/4934)
- [react-native-extra-dimensions-android](https://github.com/Sunhat/react-native-extra-dimensions-android)
- [react-native-dimension](https://github.com/dwicao/react-native-dimension)
- [Calculate Correct Window Dimensions for iOS](https://github.com/facebook/react-native/pull/19932)
- [[WIP] Add safeAreaInsets to the Dimensions module](https://github.com/facebook/react-native/pull/19921)
- [Payload for the `didUpdateDimensions` event handler is different on Android and iOS ](https://github.com/facebook/react-native/issues/19746)
- [Dimensions.get('window').height does not exclude the notch and home bar for iPhone X](https://github.com/facebook/react-native/issues/17478)

# 其他
## 如何区分开发环境和生产环境
- [Setting environment variable in react-native?](https://stackoverflow.com/questions/33117227/setting-environment-variable-in-react-native)

    使用 `babel-plugin-transform-inline-environment-variables` 存在的缺陷是，如果    

- [React-native : detect dev or production env](https://stackoverflow.com/questions/34315274/react-native-detect-dev-or-production-env)
- [React Native DEV and PROD variables](https://stackoverflow.com/questions/33264431/react-native-dev-and-prod-variables/33264515#33264515)
- [The Twelve Factor APP](https://12factor.net/config)

---

- [When to use TouchableNativeFeedback, TouchableHighlight or TouchableOpacity?](https://stackoverflow.com/questions/39123357/when-to-use-touchablenativefeedback-touchablehighlight-or-touchableopacity)
- [Better Cross-Platform React Native Components](https://medium.com/differential/better-cross-platform-react-native-components-cb8aadeba472)
