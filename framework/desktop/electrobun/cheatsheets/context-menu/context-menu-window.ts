/**
 * 演示内容：上下文菜单的主进程侧——视图右键时经 RPC 报来目标，主进程按目标
 * 构造菜单（文本区给编辑 role + 自定义项，列表项给纯自定义项并在 data 里携带
 * 目标），ContextMenu.showContextMenu 在当前指针处弹出；action 项的点击经
 * context-menu-clicked 事件回到这里，再经 RPC 发回视图应用。
 * 输入 / 前置：任何可运行的 electrobun 工程（hello-world 布局，views 构建入口为
 * src/mainview/index.ts）。先把本课范例归位：context-menu-rpc.ts → src/shared/types.ts、
 * context-menu-view.html → src/mainview/index.html、context-menu-view.ts → src/mainview/index.ts。
 * 操作：本文件作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：右键输入框弹出 剪切/拷贝/粘贴/插入日期——三个 role 项直接编辑输入框内容
 * （原生执行，终端无日志）；右键列表项弹出 置顶/删除/清空列表，点击后列表更新，
 * 终端打印 menu-action 日志。
 * 阅读主线：buildMenu() 是菜单配方的唯一来源；ContextMenu.on 是 action 项的唯一出口；
 * role 项永远不进事件路由。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow, BrowserView, ContextMenu } from "electrobun/bun";
import type { ContextMenuRPC } from "../shared/types";

const win = new BrowserWindow({
	title: "上下文菜单",
	url: "views://mainview/index.html",
	frame: { width: 520, height: 420, x: 200, y: 160 },
	// 视图右键时经这条通道把目标报上来；不传 rpc 的话 handlers 接不上通道
	rpc: BrowserView.defineRPC<ContextMenuRPC>({
		handlers: {
			messages: {
				showMenu: ({ target }) => {
					// 收到上报立即弹出：菜单位置取调用瞬间的指针位置，
					// 此时用户就停在右键处
					ContextMenu.showContextMenu(buildMenu(target));
				},
			},
		},
	}),
});

// 菜单配方：按右键目标决定结构；data 携带目标，点击时原样回传
function buildMenu(target: string) {
	if (target.startsWith("list-item:")) {
		return [
			{ label: "置顶", action: "pin-item", data: { target } },
			{ label: "删除", action: "delete-item", data: { target } },
			{ type: "separator" },
			{ label: "清空列表", action: "clear-all" },
		];
	}
	// 文本区：原生编辑角色（零代码、直接作用于输入框）+ 一个自定义动作
	return [
		{ role: "cut" },
		{ role: "copy" },
		{ role: "paste" },
		{ type: "separator" },
		{ label: "插入日期", action: "insert-date", data: { target } },
	];
}

// action 项的点击出口：载荷在包装对象的 e.data（{ action, data }）；
// role 项由原生执行，不会到达这里。1.18.1 的 on 把参数标为 unknown，
// 断言成实际形状后取值（见 README「常见问题」）
ContextMenu.on("context-menu-clicked", (e) => {
	const { action, data } = (e as { data: { action: string; data?: unknown } })
		.data;
	console.log("[bun] menu-action:", action, data);
	// 动作发回视图，由页面应用效果（处理器在 context-menu-view.ts）
	win.webview.rpc.send.menuAction({ action, data });
});
