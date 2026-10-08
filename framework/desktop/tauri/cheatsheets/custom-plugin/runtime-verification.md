# 本机最小验证:自定义插件从脚手架到发布

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,与课程「快速上手」同一套操作。需要 Cargo 与 npm 可用;插件以短名 `say` 为例。

## 1 脚手架与本地接入

1. 在应用工程根目录执行 `cargo tauri plugin new say`(生成同级子目录 `tauri-plugin-say/`),确认生成的插件目录含 `src/`、`guest-js/`、`permissions/`、`build.rs`、`package.json`、`examples/`。
2. 在插件目录 `npm install && npm run build`,确认产出 `dist-js/`。
3. 按「快速上手」完成接入:`cargo add --path ../tauri-plugin-say`、`npm install ../tauri-plugin-say`、`lib.rs` 加 `.plugin(tauri_plugin_say::init())`、capabilities 加 `say:default`。

预期:`npm run tauri dev` 后,前端 `await ping('hi')` 返回 `hi`——模板命令经 `plugin:say|ping` 通道与 `say:default` 授权调用成功,与课程「调用链路」一致。

## 2 default 集漏收新命令时的拒绝

1. 在插件里新增一条命令 `encode`(进 `commands.rs`、`build.rs` 的 `COMMANDS`、`guest-js` 导出),但**不**把 `allow-encode` 加进 `permissions/default.toml`。
2. 重启 `tauri dev` 后在应用里调用 `encode`。

预期:调用 reject,dev 下报错含 `not allowed` 并列出该命令关联的权限;把 `allow-encode` 补进 default.toml 的 `permissions` 数组、等重编译后恢复——课程「default 权限集」与常见问题第 1 条对应的真实行为。

## 3 guest-js 改动的生效条件

1. 在 `guest-js/index.ts` 给 `encode` 的返回值临时加一个前缀,保存后观察应用(dev 正在运行)。

预期:行为不变——`file:` 依赖不会自动跟踪源码;回到插件目录 `npm run build` 重新产出 `dist-js` 并等应用重编译后,新行为生效。这正是课程「调试与发布」的两条 dev 循环路径。

## 4 命名约定校验

1. 把 `Cargo.toml` 的 `name` 临时改成含下划线的 `tauri-plugin-my_say`(或把 `links` 键改成与 `name` 不一致的值),再构建应用。

预期:构建期报错,指向 crate 命名/`links` 约定;改回 `tauri-plugin-say` 且 `links` 一致后恢复——课程「命名约定」的两条硬约束。
