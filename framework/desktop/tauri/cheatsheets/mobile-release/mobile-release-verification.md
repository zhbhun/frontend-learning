# 本机最小验证:移动端发布产物与签名核对

Storybook 里的流水线检查台是定性模拟(不运行 Xcode / Gradle,不校验凭据真伪)。本文件给出在本机核对课程结论的最小步骤,基于[移动端起步](?path=/docs/mobile-setup--docs)已 init 的工程;桌面环境为 macOS。真实商店提交需要 Apple Developer 计划与 Play Console 开发者账号,没有账号时第 1、3 步仍可执行。

## 1 Android:未签名与已签名产物对照

1. 不配置任何签名,直接 `npm run tauri android build -- --aab`。

预期:构建成功,产物在 `src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`——Gradle 不拦未签名的 release 构建,对应课程「Android 签名」的「缺配置只出未签名包」。

2. 按「Android 签名」一节接好 `keystore.properties` 与 `signingConfig` 后重新构建,再用 JDK 自带的 `jarsigner -verify <aab路径>` 核对。

预期:输出包含「jar 已验证」并列出 `keyAlias` 对应的证书条目——对应「接好后 release 构建自动签名」。

## 2 Android:versionCode 派生(可选)

1. 把 `tauri.conf.json` 的 `version` 改为 `1.2.3`,`npm run tauri android build -- --apk`,然后用 SDK Build-Tools 的 `aapt2 dump badging <apk路径> | grep versionCode`。

预期:输出 `versionCode='1002003'`(1×1000000 + 2×1000 + 3)——对应「版本号」一节的位权公式。

## 3 iOS:构建中断与商店包导出(需 Apple Developer 计划)

1. 未在 Xcode 登录账号(或用免费账号)时执行 `npm run tauri ios build -- --export-method app-store-connect`。

预期:构建在签名 / 导出环节失败,不产出 ipa——对应「iOS 签名是构建的前置,失败即中断」。

2. 付费账号 + Xcode 已登录后重新执行同一命令。

预期:`src-tauri/gen/apple/build/arm64/<app-name>.ipa` 生成;API key 三件套配好后执行快速上手第 2 步的 `xcrun altool --upload-app`,App Store Connect 的 TestFlight 页出现该构建。

## 4 同版本重传:build 号

1. 不改 `version`,加构建号重跑:`npm run tauri ios build -- --export-method app-store-connect --build-number 2`。

预期:同版本产出新构建号的 ipa,可再次上传——对应「同一版本多次上传用 `--build-number` 换新构建号」。
