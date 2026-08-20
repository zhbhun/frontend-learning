// 生命周期观察台：以 exitOnLastWindowClosed: false 的常驻形态运行，
// 订阅全部 app 级事件，把每次事件的触发打到启动它的终端里。
// 订阅全部放在入口顶层、且在创建窗口之前——事件只发给已注册的 handler。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { app, BrowserWindow } from "electrobun/bun";
import Electrobun from "electrobun/bun";

const GUIDE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>生命周期观察台</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #f8fafc; color: #172033;
         font-family: system-ui, -apple-system, sans-serif; }
  main { max-width: 30em; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  ol { color: #475569; line-height: 1.9; padding-left: 1.2em; margin: 0; }
  code { font-family: ui-monospace, Menlo, monospace; }
  p { color: #475569; line-height: 1.7; margin: 12px 0 0; }
</style></head>
<body><main>
  <h1>生命周期观察台</h1>
  <ol>
    <li>点击本窗口的关闭按钮：终端打印 <code>[close]</code>，但应用不退出，Dock 图标仍在。</li>
    <li>点击 Dock 图标：终端打印 <code>[reopen]</code> 并重建本窗口。</li>
    <li>按 <code>Cmd+Q</code>：终端打印 <code>[before-quit]</code> 后应用退出。</li>
    <li>再次启动后按 <code>Ctrl+C</code>：同样先打印 <code>[before-quit]</code>（SIGINT 路径）。</li>
  </ol>
  <p><code>open-url</code> 已订阅但在 dev 模式下无法触发：URL scheme 注册需要
  构建并安装到 /Applications，见课程正文。</p>
</main></body>
</html>`;

let openedWindows = 0;

// 窗口创建收拢成一个函数：启动时和 reopen 时都要用一个窗口
function createWindow() {
	openedWindows += 1;
	const win = new BrowserWindow({
		title: `生命周期观察台 #${openedWindows}`,
		html: GUIDE_HTML,
		frame: { width: 560, height: 460, x: 200, y: 200 },
	});
	return win;
}

// ---- app 事件订阅（handler 收到完整 ElectrobunEvent，可读 .data、写 .response）----

// open-url：通过 URL scheme 或文件关联打开应用时触发（macOS，需构建安装）
Electrobun.events.on("open-url", (event) => {
	console.log("[open-url]", event.data.url);
});

// reopen：macOS 点击 Dock 图标重新激活时触发；常驻形态在这里重建窗口
Electrobun.events.on("reopen", () => {
	console.log("[reopen] Dock 重新激活，重建窗口");
	createWindow();
});

// before-quit：所有退出路径共用的事件，唯一能取消退出的位置。
// 默认放行；把下面注释的 e.response 行打开后，任何退出都会被拦下。
Electrobun.events.on("before-quit", (event) => {
	console.log("[before-quit] 收到事件（data =", event.data, "），默认放行");
	// event.response = { allow: false }; // 打开这行：Cmd+Q 将退不出去
});

// 对照：app.on 的 handler 只收到事件 payload，拿不到 event，也无法否决
app.on("before-quit", (payload) => {
	console.log("[app.on:before-quit] 只收到 payload:", payload);
});

// 全局 close 只用来观察「窗口关了、应用还在」；窗口事件的完整机制见窗口事件一课
Electrobun.events.on("close", (event) => {
	console.log(
		`[close] 窗口 ${event.data.id} 关闭，应用继续运行（exitOnLastWindowClosed: false）`,
	);
});

// ---- 启动：入口顶层代码就是启动点，没有 ready 事件要等 ----
createWindow();
console.log(
	`生命周期观察台已启动（已开窗口 ${openedWindows} 个），按窗口内步骤操作，看本终端输出`,
);
