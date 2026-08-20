/**
 * 演示内容：通知与对话框的主进程侧——视图经 RPC 请主进程代发：
 * confirmDelete（request，有响应）里 await Utils.showMessageBox 弹原生确认对话框，
 * 把用户点的按钮索引回传视图；notifyFinished（message，单向）里代发系统通知；
 * 另演示主进程直接调用：启动 5 秒后自发一条下载完成通知。
 * 输入 / 前置：任何可运行的 electrobun 工程（hello-world 布局，views 构建入口为
 * src/mainview/index.ts）。先把本课范例归位：notifications-dialogs-rpc.ts →
 * src/shared/types.ts、notifications-dialogs-view.html → src/mainview/index.html、
 * notifications-dialogs-view.ts → src/mainview/index.ts。
 * 操作：本文件作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：点草稿行的「删除」弹原生对话框（打开时聚焦「取消」），点「删除」
 * 终端打印 response: 0、列表项消失；点「取消」或 Esc 打印 response: 1、列表不动；
 * 对话框未关闭时页面按钮点不动、终端不打印——主进程停在 await。点「模拟下载完成」
 * 系统弹出通知横幅，页面状态行同步更新。启动 5 秒后还会自动弹一条通知（主进程
 * 直发，不经 RPC）。
 * 阅读主线：confirmDelete 里的 buttons / defaultId / cancelId 一次配好——危险项
 * 在 0，安全项「取消」同时是 defaultId 与 cancelId；notifyFinished 发完即忘。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow, BrowserView, Utils } from "electrobun/bun";
import type { NotificationsDialogsRPC } from "../shared/types";

const win = new BrowserWindow({
	title: "通知与对话框",
	url: "views://mainview/index.html",
	frame: { width: 520, height: 420, x: 200, y: 160 },
	// 视图经这条通道请主进程代发；不传 rpc 的话 handlers 接不上通道。
	// 注意：主进程这里的 maxRequestTime 只管主进程发出的 request（本例没有），
	// 视图等待对话框的超时要在视图侧 defineRPC 里调大（见 notifications-dialogs-view.ts）
	rpc: BrowserView.defineRPC<NotificationsDialogsRPC>({
		handlers: {
			requests: {
				// 有响应的调用：视图在等按钮索引，模态期间挂着的就是这个 request
				confirmDelete: async ({ target }) => {
					const { response } = await Utils.showMessageBox({
						type: "question",
						title: "确认删除",
						message: `删除「${target}」吗？`,
						detail: "删除后不可恢复。",
						buttons: ["删除", "取消"],
						// 安全设计：打开时聚焦「取消」，Esc / 关闭对话框也返回「取消」
						defaultId: 1,
						cancelId: 1,
					});
					console.log("[bun] confirmDelete:", target, "→ response:", response);
					return { response };
				},
			},
			messages: {
				// 单向消息：发完即忘，没有返回值
				notifyFinished: ({ file }) => {
					Utils.showNotification({
						title: "下载完成",
						subtitle: "安装包",
						body: `${file} 已就绪`,
					});
				},
			},
		},
	}),
});

// 主进程也可以直接调用（不经 RPC）：适合后台任务的完成告知
setTimeout(() => {
	Utils.showNotification({
		title: "同步完成",
		body: "3 个文件已同步",
		silent: true, // 关提示音，横幅照常弹出
	});
}, 5000);

console.log("[bun] 窗口已创建，等待 RPC 调用");
