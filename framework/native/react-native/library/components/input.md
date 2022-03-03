# 输入

- [react-native-mask-input](https://github.com/CaioQuirinoMedeiros/react-native-mask-input) - A simple and effective Text Input with mask for ReactNative on iOS and Android. Includes obfuscation characters feature.

---

# # 回车换行

- https://gist.github.com/catchin/47afe706256604959c13dc25e7bb9383
- [TextInput multiline={true} not functioning as expected](https://github.com/facebook/react-native/issues/12717)
- [0.43.3 [TextInput] multiline={true} in Android can not create newLine when I enter Soft KeyBoard of return.](https://github.com/facebook/react-native/issues/13506)
- [Fixed new line and prioritise blurOnSubmit in multiline text input ](https://github.com/facebook/react-native/pull/13890)
- [Make <TextInput multiline> default blurOnSubmit to false.](https://github.com/facebook/react-native/commit/adb6646016944fb17fd4cb3824f38a42d4785176)

## 自动展开

- [[TextInput] Add autoGrow support ](https://github.com/facebook/react-native/issues/3209)
- [[TextInput] Add auto-grow support for multiline TextInput components](https://github.com/facebook/react-native/pull/3097)
- [[TextInput - Multiline] Reimplemented RCTTextView and added auto height scaling. ](https://github.com/facebook/react-native/pull/1229)
- [react-native-auto-expanding-textinput](https://github.com/alcat2008/react-native-auto-expanding-textinput)
- [react-native-auto-grow-textinput](https://github.com/rusfearuth/react-native-auto-grow-textinput)
- [react-native-autogrow-textinput](https://github.com/wix/react-native-autogrow-textinput)
- [React Native auto growing text input](https://medium.com/@manojsinghnegi/react-native-auto-growing-text-input-8638ac0931c8)
- [making a multiline, expanding TextInput with React-Native](https://stackoverflow.com/questions/31475187/making-a-multiline-expanding-textinput-with-react-native)
- [How would I grow <TextInput> height upon text wrapping?](https://stackoverflow.com/questions/33071950/how-would-i-grow-textinput-height-upon-text-wrapping)
- [Add support for automatically resizing multiline TextInput based on content](https://react-native.canny.io/feature-requests/p/add-support-for-automatically-resizing-multiline-textinput-based-on-content)


## 多行光标显示问题

- [[Android] TextInput doesn't scroll properly when restricting the height on an expanding TextInput](https://github.com/facebook/react-native/issues/12799)
- https://snack.expo.io/BkhOoGtLZ
- 问题原因：Android 设置了 onContentSizeChange 后，TextInpt 不能准确的自动滚动（光标无法显示）
