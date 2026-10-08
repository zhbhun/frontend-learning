# 本机最小验证:体积与启动的真实运行行为

Storybook 里的两个 Canvas 是定性模拟,不运行 cargo。本文件给出在本机用真实构建核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程;桌面环境为 macOS(Apple Silicon)。所有对比都遵循课程「最佳实践」的方法:一次只改一个杠杆。

## 1 体积基线与推荐块对比

1. 不改任何配置,`npm run tauri build`,记录 `ls -lh src-tauri/target/release/` 里主可执行文件的大小(模板工程约几 MB 量级,以实测为准)。
2. 把课程「快速上手」的推荐块贴进 `src-tauri/Cargo.toml`,重新 build,复测。预期:体积可感知变小、编译时间可感知变长;具体幅度因项目而异——这正是两个 Canvas 都只标"定性示意"的原因。
3. 单独验证 `strip`:只保留 `strip = true` 再 build,对比前后可执行文件大小;用 `otool -l <二进制> | grep -c LC_SYMTAB` 或直接在崩溃日志里观察,符号剥离前后可读性不同。

## 2 依赖体积定位

- `cargo tree -d`:模板工程通常至少能看到若干被重复编译的包(版本分叉);这正是课程「依赖审计」说的体积与编译时间来源。
- `cargo install cargo-bloat && cargo bloat --release -n 10`:输出按占比排序的函数列表,再 `cargo bloat --release --crates` 看 crate 层大头;对照课程「体积」一节的体积模型,确认大头在 Rust 侧依赖,而非前端产物。
- 前端侧对照:手动增大 `src/App.tsx`(塞入大量代码)后 build,二进制增量约等于产物增量——验证「dist 多 1 MB,二进制就大 1 MB」。

## 3 启动重活:同步阻塞与异步恢复

1. 按课程「启动重活与主线程」的写法在 `setup` 里直接 `std::thread::sleep(Duration::from_secs(3))`(模拟主线程上的重活):启动窗口出现明显被拖住;若在首帧后的命令里做同样的事(同步命令),窗口渲染冻结 3 秒——对应官方"没有 async 的命令在主线程执行"。
2. 把重活改成 `tauri::async_runtime::spawn(async move { ... })`:窗口照常出现、界面不再冻结——对应时间线实例里"异步 → 首帧竖线不被推迟"的读数。

## 4 感知与时间(可选)

按官方 splashscreen 方案配置主窗口 `visible: false` 与 splash 窗口:启动时 splash 立即出现,但主窗口出现(首帧)的时间与不加 splash 时几乎一致——验证实例里"splash 不移动首帧竖线"的结论。
