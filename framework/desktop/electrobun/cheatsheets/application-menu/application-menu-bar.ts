/**
 * 演示内容：应用菜单的完整结构（角色项 / 自定义 action 项 / accelerator / 分隔线 /
 * 禁用与勾选项）与 application-menu-clicked 事件的载荷形状。
 * 输入 / 前置：任何可运行的 electrobun 工程（如 1.3 课程的 hello-world），
 * 其 views://mainview/index.html 已按 electrobun.config.ts 装配完成。
 * 操作：把本文件内容作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：菜单栏出现三段——应用菜单里 Quit 自动挂 ⌘Q；「文件」下拉里「保存项目」
 * 显示 ⌘S，点它终端打印 payload: { id: …, action: 'save-project', data: { projectId: 42 } }，
 * 点「导出 PDF」打印对应载荷，「关闭但不保存」灰显不可点；「编辑」下拉全是角色项，
 * 点击由系统执行、终端不打印。点 Quit 应用直接退出（终端同样不会有 payload 打印）。
 * 阅读主线：setApplicationMenu 的三段结构与 events.on 的事件回流是两条独立链路。
 */
import Electrobun, { ApplicationMenu, BrowserWindow } from "electrobun/bun";

new BrowserWindow({ title: "应用菜单", url: "views://mainview/index.html" });

ApplicationMenu.setApplicationMenu([
	// 第一项：不写 label——macOS 上菜单栏第一格就是应用菜单位置，应用级角色放这里
	{
		submenu: [
			{ label: "Quit", role: "quit" }, // role：原生执行，自动绑定 ⌘Q
			{ type: "separator" },
			{ role: "hide" }, // role 项可不写 label，用角色默认标签兜底
			{ role: "hideOthers" },
			{ type: "separator" },
			{ role: "showAll" },
		],
	},
	// 第二项：自定义命令用 action，点击作为事件回到主进程
	{
		label: "文件",
		submenu: [
			{
				label: "保存项目",
				action: "save-project",
				accelerator: "s", // macOS 显示 ⌘S，Windows 显示 Ctrl+S
				data: { projectId: 42 }, // 载荷随点击事件带回
			},
			{ label: "导出 PDF", action: "export-pdf", data: { format: "pdf" } },
			{ type: "separator" },
			{ label: "自动保存", action: "toggle-autosave", checked: true }, // 带勾选标记
			{ label: "关闭但不保存", action: "close-unsaved", enabled: false }, // 灰显不可点
		],
	},
	// 第三项：编辑角色——文档注明 ⌘C/⌘V 等文本编辑快捷键由这些角色项绑定
	{
		label: "编辑",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ role: "pasteAndMatchStyle" },
			{ role: "delete" },
			{ type: "separator" },
			{ role: "selectAll" },
		],
	},
]);

// role 项不会进这个回调（原生层直接执行）；这里只收到 action 项。
// 等价写法：ApplicationMenu.on("application-menu-clicked", (e) => { ... })
Electrobun.events.on("application-menu-clicked", (e) => {
	console.log("payload:", e.data); // { id, action, data }，data 未挂时为 undefined
});
