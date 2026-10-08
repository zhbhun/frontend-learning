# 本机最小验证:移动端 init 与 dev 的真实行为核对

Storybook 里的起步检查台是定性模拟(只对照课程清单判断,不探测本机环境,不运行 Xcode / Gradle)。本文件给出在本机核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程;桌面环境为 macOS(Apple Silicon)。首次执行前先装齐 iOS 清单(完整 Xcode、`brew install cocoapods`);Android 清单可按需另行核对。

## 1 iOS:targets 与 init 产物

1. `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`,然后 `rustup target list --installed` 确认三个 target 在列——对应课程「iOS Rust targets ×3」。
2. `npm run tauri ios init`:完成后工程根目录出现 `gen/apple/`(Xcode 工程,含 Pods 依赖)——对应课程「初始化目标平台」;`src-tauri/` 与前端目录没有变化。
3. 每个平台 init 一次即可:再次执行 `npm run tauri ios init`,观察 CLI 对已存在 `gen/apple` 的提示——对应课程「每个平台 init 一次」。

## 2 iOS:模拟器运行与热重载

1. `npm run tauri ios dev`:首次运行耗时数分钟(编译全部 Rust 依赖);CLI 列出模拟器供选择,选择后应用在模拟器启动——对应课程「模拟器与真机运行」的默认行为。
2. 改一行前端文案保存:模拟器内立即热重载,不需要重新编译——与桌面 `tauri dev` 体验一致。
3. `npm run tauri ios dev --open`:Xcode 被拉起并接管构建与部署,CLI 进程保持运行——对应 `--open` 的行为与注意事项。

## 3 Android:环境变量核对(可选,需先装 Android Studio)

1. 按「环境要求」一节把 `JAVA_HOME`、`ANDROID_HOME`、`NDK_HOME` 写入 `~/.zshrc` 并重开终端,`echo` 逐个确认非空——这是 Android 环境问题的高发源。
2. 故意 `unset NDK_HOME` 后执行 `npm run tauri android dev`,观察 Gradle 阶段的报错;恢复变量后重跑通过——对应「常见问题」第二条的定位路径。
3. `npm run tauri android init` 生成 `gen/android/`(Gradle 工程);Device Manager 创建一个 AVD 后 `npm run tauri android dev` 部署到该模拟器。

## 4 真机(可选)

iOS 真机连接后 `npm run tauri ios dev`:CLI 应优先选中真机;若白屏,按「常见问题」核对 `TAURI_DEV_HOST`、`--force-ip-prompt` 与「本地网络」权限。Android 真机需开启开发者模式与 USB 调试后用 `chrome://inspect` 确认可检查。
