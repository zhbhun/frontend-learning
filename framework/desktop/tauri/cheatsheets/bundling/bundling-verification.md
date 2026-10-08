# 本机最小验证:打包产物的真实构建核对

Storybook 里的打包模拟器是定性模拟(产品名 `Notes`、版本 `0.1.0`、arch 取各平台典型值),不运行 cargo。本文件给出在本机用真实构建核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程;桌面环境为 macOS(Apple Silicon)。

## 1 targets "all" 的平台映射与产物命名

1. 不改任何配置,`npm run tauri build`,然后 `ls src-tauri/target/release/bundle/`。预期:macOS 上是 `dmg/` 与 `macos/` 两个子目录——对应课程里 `"all"` 在 macOS 映射为 app 与 dmg。
2. 观察 DMG 文件名:形如 `<productName>_<version>_aarch64.dmg`,与正文参考表的分段规则一致(`productName_version_arch`);.app 目录为 `bundle/macos/<productName>.app`。

## 2 跳过打包与补跑打包

1. `npm run tauri build -- --no-bundle`:构建结束后 `bundle/` 不再更新;裸二进制在 `src-tauri/target/release/<productName>`(无扩展名)。
2. 接着 `npm run tauri bundle`:不重新编译,只执行打包阶段,`bundle/` 下的产物恢复——对应课程「打包配置的迭代不必全量编译」。
3. `npm run tauri build -- --bundles dmg`:只更新 `bundle/dmg/`——对应 `--bundles` 覆盖 `targets`。

## 3 图标全套生成(可选)

1. 准备一张 1024×1024、带透明度的 PNG 命名为 `app-icon.png` 放在工程根目录。
2. `npm run tauri icon`,对照 `src-tauri/icons/` 下生成的清单(`icon.icns`、`icon.ico`、各尺寸 PNG、`Square*Logo.png` 等)与课程「图标」小节的表。

## 4 Windows / Linux 产物(可选)

本机是 macOS,MSI / deb / rpm / AppImage 的产物核对走 CI 或对应平台:按课程「平台产物」一节的表格逐项对照产物目录与文件名(CI 矩阵做法见 5.2.4 一课)。
