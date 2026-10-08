# 本机最小验证:事件投递与订阅清理

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,不引入新依赖。

## 1 Rust→前端事件与订阅清理

1. 按课程「快速上手」添加 `scan` 命令与 `ScanPanel` 组件,并在 `generate_handler!` 注册。
2. 确认 `main.tsx` 使用 `<React.StrictMode>`(官方 react-ts 模板默认开启)。
3. `npm run tauri dev`,点「开始扫描」。

预期:

- 进度文本从 0 变为 5 / 5;把 `emit` 的值改成 `step * 10` 再触发,界面同步变化。
- 把 `useEffect` 换成课程「React 中的订阅与清理」一节的「忽略竞态」写法,并在 `listen` 的处理器里加一行 `console.log('scan-progress', event.payload)`;再用条件渲染在两个 `ScanPanel` 实例间切换 N 次。之后每点一次「开始扫描」,控制台打印 N+1 行(正常应为 1 行);换回 `disposed` 标准写法后恢复 1 行。
- 界面上看不出异常是正常的:React 18 会静默丢弃对已卸载组件的状态更新——泄漏只能靠日志行数发现,这正是它难定位的原因。

## 2 投递矩阵抽查

1. 按[多窗口](?path=/docs/multi-window--docs)一课把 `settings` 窗口加入 `app.windows` 与 capability 的 `windows` 列表。
2. `src-tauri/src/lib.rs` 的 `setup` 里注册两个 Rust 监听:

```rust
use tauri::Listener;

.setup(|app| {
    app.listen("ping", |e| println!("[app.listen] {}", e.payload()));
    app.listen_any("ping", |e| println!("[listen_any] {}", e.payload()));
    Ok(())
})
```

3. 两个窗口的组件里各注册一个命名空间监听(label 用 `getCurrentWebviewWindow().label` 打印区分)。在 main 窗口前端分别执行:

```ts
await emit('ping', { from: 'main' });            // 广播
await emitTo('settings', 'ping', { from: 'main' }); // 定向
```

4. 再从 Rust 侧发射一次(如临时命令):`app.emit_to("main", "ping", payload)?`。

预期:

| 发射 | main 窗口 | settings 窗口 | `app.listen` | `listen_any` |
| --- | --- | --- | --- | --- |
| 前端 `emit`(广播) | 收到 | 收到 | 收到 | 收到 |
| 前端 `emitTo('settings')` | 无 | 收到 | 无 | 收到 |
| Rust `emit_to("main")` | 收到 | 无 | 无 | 收到 |

`app.listen` 收不到两次定向投递——target 为 `App` 的监听只收广播,与课程「投递规则」一节的结论一致。

## 3 Rust 监听的 payload 形态

上一步两个 `println!` 输出的是原始 JSON 字符串(如 `{"from":"main"}`),不是结构体;用 `serde_json::from_str::<T>(event.payload())` 才能还原。同时验证前端 `event.payload` 已是反序列化后的对象——两端形态不同是课程「投递规则」一节明确给出的边界。
