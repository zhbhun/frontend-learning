# 本机最小验证:ACL 放行与拒绝的真实运行时

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,需要装过 fs 插件(`npm run tauri add fs`)并有一个 label 为 `settings` 的第二窗口——没有的话,在 `src-tauri/src/lib.rs` 的 `setup` 里加:

```rust
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

.setup(|app| {
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::default())
        .title("设置")
        .build()?;
    Ok(())
})
```

两个窗口渲染同一个前端页面,这样 settings 窗口里也有可点的按钮。每步改完 capability 都要等 dev 重编译(终端出现 Compiling/Running)再操作。

## 1 无授权:默认拒绝与报错文案

1. 保持 `default.json` 的 `windows` 为 `["main", "settings"]`、`permissions` 只剩 `["core:default"]`(临时删掉 `fs:default`)。
2. `npm run tauri dev`,在 main 窗口执行课程「快速上手」的 `readTextFile('config.json', { baseDir: BaseDirectory.AppData })`。

预期:调用 reject,devtools 控制台的报错形如 `fs.read_text_file not allowed. Permissions associated with this command: …`——冒号后列出能放行这条命令的权限名(`fs:allow-read-text-file`、`fs:default` 等),与课程「无授权」一行的报错样式一致。把 `fs:default` 加回 `permissions`,等重编译后调用成功。

## 2 窗口未覆盖:零覆盖 = 零授权

1. 把 `default.json` 的 `windows` 改回 `["main"]`,等重编译。
2. 在 settings 窗口里点同一个「读文件」按钮,再看它的 devtools 控制台。

预期:报错换成 `… not allowed on window "settings", webview "settings", …` 形态——窗口没有被任何 capability 覆盖。再在 settings 窗口的控制台执行一段 `listen`(事件订阅属 core 命令),同样被拒:零覆盖的窗口连 core 授权都没有,与课程「零覆盖 = 零授权」的规则一致。

## 3 deny 优先于 allow

1. `permissions` 同时写 `"fs:default"` 与 `"fs:deny-read-text-file"`,`windows` 恢复 `["main", "settings"]`,等重编译。
2. 在 main 窗口再点「读文件」。

预期:依旧拒绝,报错形如 `fs.read_text_file explicitly denied on origin …`——`fs:default` 明明授权了,`fs:deny-read-text-file` 仍然压过它;删掉 deny 条目后恢复放行。

## 4 应用命令不经 ACL

1. 在第 2 步的零覆盖状态(settings 不在 `windows` 里)下,在 settings 窗口调用应用自建命令,如模板的 `invoke('greet', …)`(确认它是 `generate_handler!` 注册的普通命令)。

预期:**调用成功**——应用命令默认不经 ACL,与 capability 无关;这正是课程「最佳实践」里要用 `AppManifest` 收口的暴露面。把它换成任意插件命令(如 `invoke('plugin:dialog|open', …)`)则立即被拒。

## 5(可选)release 构建的报错差异

`npm run tauri build` 后运行安装产物,重复第 1 步的无授权调用。

预期:报错只剩统一一句 `Command plugin:fs|read_text_file not allowed by ACL`,不再列出候选权限——所以权限排查一律在 dev 构建(`tauri dev`)下做。
