# 本机最小验证:托管状态的真实运行时

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,不引入新依赖。

## 1 状态跨调用存活,窗口刷新不重置

1. 按课程「快速上手」添加 `AppState`、`increment` 命令并注册(`manage` 与 `generate_handler!` 各一处)。
2. `npm run tauri dev`,连点按钮,数字逐次累加。
3. 在窗口里刷新前端(Cmd+R 或菜单「重新加载」),再点按钮。

预期:

- 刷新后数字**接着刷前的值继续累加**——`counter` 存在 Rust 进程的托管状态里,不在前端。
- 重启应用(`Ctrl+C` 后重新 `tauri dev`)归零——托管状态是内存态,生命周期从注册到进程退出。

## 2 类型不符的真实报错

1. 把 `Builder::manage(Mutex::new(AppState::default()))` 注释掉,保留命令签名不变。
2. `tauri dev` 中点按钮,在前端控制台看 reject 原因。

预期:错误信息形如 `state not managed for field state on command increment. You must call .manage() before using this command`——与课程「命令内访问 State」一节和实例 wrong-type 场景一致。恢复 `manage` 后正常。

3. 再把命令签名改成 `State<'_, AppState>`(去掉 `Mutex` 包装,保留 `manage` 注册 `Mutex<AppState>`),点按钮。

预期:同样 reject `state not managed`——差一层包装就是另一个类型,状态表里查不到;编译期无任何警告,问题只在运行时暴露。

## 3 Rust 侧访问与锁排队

1. 在 `setup` 里加一行验证 Rust 侧访问(需要 `use tauri::Manager;`):

```rust
.setup(|app| {
    let counter = app.state::<std::sync::Mutex<AppState>>();
    println!("初始 counter:{}", counter.lock().unwrap().counter); // 0
    Ok(())
})
```

2. 把 `state::<T>()` 的类型改成未注册的任意类型(如 `Mutex<Vec<u8>>`),运行观察 panic(`state not found for type ...`),改回后恢复。
3. 按课程「锁与 async 命令」加 `async_runtime::Mutex<JobQueue>` 与 `enqueue` 命令;再写一条持锁 `sleep` 1 秒的 `slow_job` 命令,前端连发两条 `invoke('slow_job')`,在两条命令里各加一行 `println!`。

预期:第二条 `slow_job` 的 `lock().await` 等到第一条释放后才打印——日志次序严格串行;`async_runtime::Mutex` 的排队与课程「锁与 async 命令」一节的结论一致。把两把锁换成 `std::sync::Mutex` + 同步命令验证对照:第二条命令直接排在主线程上依次执行,同样有序,但持锁期间主线程被占住(界面无响应的根因,见命令课「异步命令」一节)。
