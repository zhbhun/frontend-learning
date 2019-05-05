# 设置 Android 状态栏字体颜色
- [StatusBar.setBarStyle("dark-content", true) doesn't work on Android modals ](https://github.com/wix/react-native-navigation/issues/1867)
- [the barStyle=“dark-content” of the statusBar does not work on android 5](https://stackoverflow.com/questions/41463641/the-barstyle-dark-content-of-the-statusbar-does-not-work-on-android-5)

- Android 自动识别背景色来调整状态栏字体颜色，例如：rgba(255, 255, 255, 0.8) 以下透明度的的背景色，状态栏字体颜色是白色的，该值以上透明度的背景色，状态栏颜色为黑色
- iOS 通过 barStyle 控制字体颜色

    - linght-content：白色
    - dark-content：黑色

# Anrdoid 4.x.x 不支持 translucent
- [[Android] StatusBar Translucent not working in Android 4.x.x after upgrading to react 0.23](https://github.com/facebook/react-native/issues/6876)
- https://source.android.com/source/build-numbers
