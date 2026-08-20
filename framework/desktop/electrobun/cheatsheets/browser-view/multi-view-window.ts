// 本文件是主进程（bun 侧）源码范例，不是 Storybook 实例：真实窗口行为以运行它为准。
// storybook 工作区未安装 electrobun 依赖，@ts-nocheck 让根工作区的类型检查通过；
// 复制到真实工程后可删除下面这行。
// @ts-nocheck
//
// 演示内容：一个窗口里的三视图组合——窗口自动创建的主视图、windowId 挂载的远程侧栏、
// html 内联的置顶徽标视图；创建顺序决定层级（后创建的在上），autoResize: false 的
// 子视图按 frame 固定且不跟随窗口 resize。
// 运行条件：把本文件内容放进 1.3 hello-world 工程（cheatsheets/first-window/hello-world/）
// 的 src/bun/index.ts（工程里已有 mainview 视图装配），或放进 tester 工程同路径，
// 然后 bun start（tester 为 bunx electrobun dev）。
// 预期结果：左侧 280px 侧栏加载 electrobun.dev；右侧为主视图页面；右上角显示
// 内联 html 的徽标视图；拖大窗口时主视图跟随铺满、侧栏与徽标不动；终端打印三个视图
// 的 id 与 windowId；关闭窗口后所有视图随窗口清理、应用退出。
import { BrowserWindow, BrowserView } from "electrobun/bun";

// 第 1 层：主视图。new BrowserWindow 自动创建，url 等选项转发给它，
// autoResize 默认 true → 铺满内容区并跟随窗口尺寸。
const win = new BrowserWindow({
	title: "BrowserView 多视图",
	url: "views://mainview/index.html",
	frame: { width: 1000, height: 640, x: 200, y: 200 },
});

// 第 2 层：远程侧栏。windowId 挂到同一窗口；autoResize: false 让 frame 生效，
// 否则默认 true 会铺满整个窗口、盖住主视图（见正文常见问题）。
const sidebar = new BrowserView({
	windowId: win.id,
	autoResize: false,
	frame: { x: 0, y: 0, width: 280, height: 600 },
	url: "https://electrobun.dev",
	// 远程内容且不需要与主进程通信时，可再打开沙箱（sandbox: true），
	// 只保留事件、关闭 RPC 通道。
});

// 第 3 层：内联 html 的徽标视图，最后创建 → 压在前面两个视图之上。
// x: 740 + 宽 240 = 右边缘留 20px，落在窗口右上角。
const badge = new BrowserView({
	windowId: win.id,
	autoResize: false,
	frame: { x: 740, y: 16, width: 240, height: 40 },
	html: `<!DOCTYPE html>
<html><body style="margin:0;display:grid;place-items:center;height:100vh;
background:#4f7cff;color:#fff;font:600 14px system-ui,sans-serif;
border-radius:8px;">
第 3 个视图 · 创建顺序决定它在最上层
</body></html>`,
});

// 主进程 stdout 就在启动它的终端里：核对三个视图确实同属一个窗口。
console.log(
	"窗口视图：",
	BrowserView.getAll().map((view) => ({
		id: view.id,
		windowId: view.windowId,
	})),
);

// 需要撤掉某个视图时调用 remove()（徽标被移除后，其下方的主视图重新可见）：
// setTimeout(() => badge.remove(), 8000);
