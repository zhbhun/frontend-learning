// webview 标签观察台的主进程：
// 创建宿主窗口（views://mainview），并在主进程订阅 webview 事件——
// 标签创建的子 webview 事件同样进入 Electrobun.events 总线，
// 全局通道是事件名本身，视图级通道是「事件名-webviewId」。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow } from "electrobun/bun";
import Electrobun from "electrobun/bun";

const win = new BrowserWindow({
	title: "webview 标签观察台",
	url: "views://mainview/index.html",
	frame: { width: 960, height: 1000, x: 200, y: 100 },
});

// 主进程侧的证据通道：与宿主页面的 tag.on() 同源不同端。
// event.data.detail 的形态与宿主端一致（host-message 是对象，导航系是字符串）。
Electrobun.events.on("dom-ready", (event) => {
	console.log(`[bun:dom-ready] webview ${event.data.detail}`);
});
Electrobun.events.on("did-navigate", (event) => {
	console.log(`[bun:did-navigate] ${event.data.detail}`);
});
Electrobun.events.on("host-message", (event) => {
	console.log("[bun:host-message]", event.data.detail);
});

console.log(`观察台已启动（窗口 id = ${win.id}），子 webview 事件会同时打到本终端`);
