# 本机最小验证:通道与日志的真实运行时

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,log 插件已按课程「快速上手」装好(`npm run tauri add log`)。

## 1 前端与 Rust 日志都进终端、落文件

1. `src/main.tsx` 加 `info('前端日志就绪')`,`greet` 命令里加 `log::info!("greet 被调用:name={name}")`(`log` crate 缺失就补 `log = "0.4"`)。
2. `npm run tauri dev`,在前端触发一次 `greet` 调用(模板自带的输入框)。

预期:终端出现两行 `[INFO]` 日志,格式形如 `2026-10-07T08:00:00.000Z[<应用名>][INFO] 前端日志就绪`(时间默认 UTC)。打开 `~/Library/Logs/{bundle identifier}/` 下以应用包名命名的日志文件(Windows / Linux 路径见课程表),两行内容与终端一致——默认 target 就是 Stdout + LogDir。

## 2 devtools 的 dev / release 可用性差异

1. 在 `tauri dev` 的窗口里:右键菜单有 Inspect Element,`Cmd+Opt+I`(Windows / Linux `Ctrl+Shift+I`)也能打开检查器。
2. `npm run tauri build` 后运行 `src-tauri/target/release/bundle` 里的产物:右键没有 Inspect,快捷键无效。

预期:与课程「可用性规则」一致——release 默认禁用。在 `src-tauri/Cargo.toml` 给 tauri 加 `features = ["devtools"]` 重新 `tauri build`,或改跑 `npm run tauri build -- --debug`,检查器恢复可用。macOS 验证完把 `devtools` feature 撤掉,避免带进上架包。

## 3 Rust 日志转发进 devtools 控制台

1. Builder 的 targets 里加 `Target::new(TargetKind::Webview)`,前端执行 `attachConsole()`。
2. 触发一次 `greet`,同时打开 devtools 控制台。

预期:Rust 侧的 `greet 被调用…` 出现在 devtools 控制台(经 `log://log` 事件转发);删掉 `Webview` target 或调用 `detach` 后停止。

## 4 panic 的两种症状(临时代码,验证完删掉)

1. **同步命令 panic:** 在 `greet` 命令体开头临时加 `panic!("boom");`,触发调用。
   预期:应用窗口直接退出(闪退),`tauri dev` 终端出现 `thread 'main' panicked at src-tauri/src/lib.rs:…: boom` 形态的输出。
2. **异步命令 panic:** 把 `greet` 改成 `async fn` 再保留 `panic!("boom");`,重新触发。
   预期:应用不再闪退,前端 invoke 的 Promise 永远挂起、无任何报错;终端仍出现 `panicked at`(线程名形如 `tokio-runtime-worker`)。两种形态都不会得到正常的 reject。
3. `RUST_BACKTRACE=1 npm run tauri dev` 后重复任一 panic。

预期:panic 行之后多出完整调用栈(`note: Some details are omitted, run with RUST_BACKTRACE=full` 提示说明栈在生效)。验证完删掉全部 `panic!("boom");`。

## 5 panic hook 把崩溃写进日志文件

1. 按课程「panic 排查」在 `main` 开头挂 `std::panic::set_hook`,临时重新加回一个 `panic!` 触发点并调用。
2. 打开 LogDir 下的日志文件。

预期:文件里出现 `panic: …` 的 `[ERROR]` 行(终端 stderr 也仍有原始 panic 输出);重复第 4 步的异步 panic,日志同样落文件——这正是打包应用没有终端时的黑匣子。验证完删掉触发点。
