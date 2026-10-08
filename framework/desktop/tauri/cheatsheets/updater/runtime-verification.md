# 本机最小验证:自动更新的真实运行行为

Storybook 里的 Canvas 是示意模拟,不发起网络请求、不运行构建。本文件给出在本机把课程结论落到真实更新的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程;桌面环境为 macOS(Apple Silicon)。

## 1 密钥与签名工件

1. `npm run tauri signer generate -- -w ~/.tauri/myapp.key`:确认生成 `myapp.key` 与 `myapp.key.pub` 两个文件;公钥内容以 minisign 注释行 + base64 组成——对应实例底部预览的 `dW50cnVzdGVk…` 串。
2. 公钥填进 `plugins.updater.pubkey`、`bundle.createUpdaterArtifacts` 置 `true` 后执行 `TAURI_SIGNING_PRIVATE_KEY=~/.tauri/myapp.key npm run tauri build`:确认 `src-tauri/target/release/bundle/` 各平台目录出现 `.sig` 文件,`cat *.sig` 可见注释行 + base64。
3. 故障注入(对应实例「私钥不匹配」终止点):用另一对密钥做环境变量重新构建,把新 `.sig` 填进沿用旧公钥的客户端清单——客户端 check 后应报签名验证失败,不进入安装。

## 2 清单与版本比较

1. 用任意静态服务器(`npx serve` 等)把一个目录挂成本地更新端点:放入手写的 `latest.json`(严格按课程字段表,`signature` 粘贴 `.sig` 文件内容本身)与对应工件。
2. 版本比较实验(对应实例 check 终止点):清单 `version` 高于本机 → `check()` 拿到 `Update` 对象;等于或低于本机 → 返回 `null`。`pub_date` 与 `notes` 缺省不影响判定。
3. 清单校验实验:故意把一个平台键拼错(如 `darwin-aarch64` 写成 `macos-aarch64`)——即使本机平台字段正确,客户端也收不到更新,对应「整份清单先校验、再比较版本」。

## 3 下载、安装与重启

1. 在 `check()` 后接课程「下载安装与重启」的事件代码:观察控制台按 `Started → Progress×N → Finished` 顺序输出,`contentLength` 与工件实际大小一致。
2. 确认「重启不是必须的」:不调用 `relaunch()` 时应用继续运行,手动退出再启动后版本号变为清单 `version`。
3. 动态接口实验(可选):本地起一个按 `{{target}}`/`{{arch}}` 返回 204 或 200 的接口,验证 204 时 `check()` 为 `null`、200 时走完整链路;端点数组里放两个地址,让第一个返回 404,观察客户端落到第二个端点。
