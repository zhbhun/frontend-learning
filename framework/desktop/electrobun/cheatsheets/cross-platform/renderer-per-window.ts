/**
 * 演示内容：同一应用里按窗口选择渲染后端——一个窗口走系统 WebKit（native），
 * 一个窗口走捆绑的 CEF（cef），并打印构建期写下的 renderer 信息。
 * 前置状态：macOS + hello-world 工程（tester 形态，electrobun 1.18.1），
 *   electrobun.config.ts 的 build.mac.bundleCEF 设为 true（首次构建联网获取 CEF 部件）。
 * 操作：把本文件内容放进工程的 src/bun/index.ts，运行 bun start。
 * 预期结果：先弹出 native 窗口（WKWebView），2 秒后弹出 cef 窗口（Chromium），
 *   两个窗口都加载 views://mainview/index.html；终端打印 defaultRenderer 与
 *   availableRenderers（应为 ["native","cef"]）。
 * 阅读主线：BuildConfig.get() 读构建期信息（第 1 步验证 CEF 已进包）→
 *   new BrowserWindow({ renderer }) 逐窗口指定后端（第 2 步）。
 *   注意：macOS / Windows 允许这样混用；Linux 不允许（所有 webview 必须统一 renderer）。
 */
import { BrowserWindow, BuildConfig } from "electrobun/bun";

// 第 1 步：读构建期写下的 renderer 信息（来自应用包 Resources/build.json）
const config = await BuildConfig.get();
console.log("defaultRenderer:", config.defaultRenderer); // 默认 "native"
console.log("availableRenderers:", config.availableRenderers); // 捆绑后含 "cef"

// 第 2 步：逐窗口指定后端——先开一个系统引擎窗口
const nativeWindow = new BrowserWindow({
	title: "native 窗口（WKWebView）",
	url: "views://mainview/index.html",
	frame: { width: 480, height: 320, x: 140, y: 160 },
	renderer: "native", // 省略时取平台段 defaultRenderer（默认也是 native）
});
console.log("native window id:", nativeWindow.id);

// 2 秒后再开一个 CEF 窗口：两个窗口引擎不同、页面相同，方便对照渲染差异
setTimeout(() => {
	const cefWindow = new BrowserWindow({
		title: "cef 窗口（Chromium）",
		url: "views://mainview/index.html",
		frame: { width: 480, height: 320, x: 660, y: 160 },
		renderer: "cef", // 用捆绑的 CEF；要求构建时 build.mac.bundleCEF 为 true
	});
	console.log("cef window id:", cefWindow.id);
}, 2000);
