# 安装使用

## 问题

### Window 系统安装 expo-cli 时卡在 @expo/traveling-fastlane-linux

错误日志

```
@expo/traveling-fastlane-linux@1.82 (sha-----Some sha string) seems to be corrupt. Trying once again @expo/traveling-fastlane-darwin SILL extract.
```

解决方法：在安装命令后面加上选型 `--no-optional`

```bash
npm install expo-cli --global --no-optional
```

参考文献

- [installing Expo-cli using npm hangs](https://github.com/expo/expo-cli/issues/440)
- [Can’t install expo-cli, hangs on installing @expo/traveling-fastlane-linux@1.9.9](https://forums.expo.io/t/cant-install-expo-cli-hangs-on-installing-expo-traveling-fastlane-linux-1-9-9/24981)
- [Can`t run “npm install expo-cli --global”](https://stackoverflow.com/questions/53361026/cant-run-npm-install-expo-cli-global)
