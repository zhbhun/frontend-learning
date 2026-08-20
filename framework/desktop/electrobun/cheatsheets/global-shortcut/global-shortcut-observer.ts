/**
 * 演示内容：全局快捷键的注册结果、失焦触发、备选降级与 before-quit 生命周期清理。
 * 输入 / 前置：任何可运行的 electrobun 工程（如 1.3 课程的 hello-world），
 * 其 views://mainview/index.html 已按 electrobun.config.ts 装配完成。
 * 操作：把本文件内容作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）；
 * 启动后点其他应用让本应用失焦，再按注册成功的组合键，观察终端输出。
 * 预期结果：启动打印「生效组合: …」——首选组合被其他应用占用（register 返回 false）
 * 时自动降级到备选，两个都被占用时打印注册失败；失焦状态下按组合键终端打印
 * 「触发: …」，证明回调不依赖本应用窗口聚焦；按 Ctrl-C 退出时打印清理日志。
 * 阅读主线：register 的布尔返回值驱动备选降级；回调无参数，触发的是哪个组合靠闭包
 * 捕获；框架退出路径不会自动清理（1.18.1 的 Utils.quit 只发 before-quit），清理自己挂。
 */
import Electrobun, { BrowserWindow, GlobalShortcut } from "electrobun/bun";

new BrowserWindow({ title: "全局快捷键", url: "views://mainview/index.html" });

// 备选链：首选组合被其他应用占用时自动降级（官方 kitchen 预设写法）
const candidates = ["CommandOrControl+Shift+T", "Alt+Shift+Space"];
const active = candidates.find((accelerator) =>
	GlobalShortcut.register(accelerator, () => {
		// 回调没有参数：触发的是哪个组合靠闭包捕获
		console.log(`触发: ${accelerator}`);
	}),
);

if (!active) {
	console.log("两个候选组合都注册失败：被占用或写法无效");
} else {
	console.log(`生效组合: ${active}`);
	console.log("isRegistered:", GlobalShortcut.isRegistered(active));
}

// 退出清理：Utils.quit()（含 Ctrl-C 的 SIGINT 路径）先发 before-quit 再退出，
// 框架在这条路径上不会自动 unregisterAll——清理自己挂在这里做。
Electrobun.events.on("before-quit", () => {
	GlobalShortcut.unregisterAll();
	console.log("已注销全部全局快捷键");
});
