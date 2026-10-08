# 本机最小验证:系统托盘的真实运行行为

Storybook 里的 Canvas 是浏览器模拟,不运行 Tauri。本文件给出在本机用真实 Tauri 运行时核对课程结论的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程,并已按课程「快速上手」开启 `tray-icon` feature、接入 `lib.rs` 的托盘与 `RunEvent::ExitRequested` 拦截。桌面环境为 macOS(Apple Silicon);托盘为桌面能力,移动端没有对应 API。

## 1 托盘创建与左键显示窗口

`npm run tauri dev` 后预期:

- macOS 菜单栏右端出现应用图标;悬停显示 tooltip「Tauri 托盘」。
- 主窗口可见时点托盘左键:窗口 `unminimize + show + set_focus`,没有菜单弹出(`show_menu_on_left_click(false)`);右键托盘弹出「显示主窗口 / 退出 Tauri」菜单。
- 把 `show_menu_on_left_click(false)` 改成 `true`(或删掉该行)重启:左键也弹菜单,`on_tray_icon_event` 里的 `Click` 事件读数仍然打印——菜单显示与事件监听互不影响,与课程「托盘菜单」一致。

## 2 托盘菜单事件与 id 分发

右键托盘点「显示主窗口」,控制台(Rust 侧加 `println!` 验证)输出 `menu event: show`;点「退出 Tauri」进程结束。在 `TrayIconBuilder::on_menu_event` 里打印所有事件时,应用菜单(如 macOS 顶部菜单)的点击也会到达同一个 handler——菜单事件是全局广播,按 id 分发,与课程「托盘菜单」一致。

## 3 关窗常驻与 code 区分

按课程「快速上手」的 `run` 代码(含 `code.is_none()` 判断):

1. 点窗口关闭按钮:窗口消失、进程不退(活动监视器 / `ps` 可见进程),托盘图标仍在。
2. 此时点托盘「显示主窗口」:无反应——`get_webview_window("main")` 返回 `None`,窗口已销毁。在 handler 里打印该返回值可确认;把课程 `close-resident` 实例的提示与之一一对照。
3. 右键托盘 →「退出 Tauri」:进程真正结束——`app.exit(0)` 的 `code = Some(0)` 不被 `code.is_none()` 拦截。
4. 删掉 `code.is_none()` 判断、直接 `api.prevent_exit()`:第 3 步的退出也会被拦死,进程退不出去——常见问题第二条的复现。

## 4 窗口级拦截路线对照

把 app 级拦截换成窗口级(`setup` 中):

```rust
let window = app.get_webview_window("main").unwrap();
let window_clone = window.clone();
window.on_window_event(move |event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window_clone.hide();
    }
});
```

预期:关窗后窗口只是隐藏,点托盘左键 `show() + set_focus()` 立即恢复——不需要重建窗口,与课程「关窗常驻」的两条路线对照一致。JS 侧 `onCloseRequested` 的 `preventDefault()` 写在 `await` 之后时窗口照常关闭,对照常见问题第六条。

## 5 Linux 差异(可选,需 Linux 环境)

Linux 上预期:图标显示依赖菜单(不挂菜单时图标可能不出现);悬停与点击不产生任何 `TrayIconEvent`;右键菜单由系统弹出、菜单点击事件照常——与课程「托盘事件」「托盘菜单」的 Linux 边界一致。
