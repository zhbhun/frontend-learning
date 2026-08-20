/**
 * 演示内容：titleBarStyle: "hidden" 的无边框窗口 + 自绘标题栏的窗口控制——
 * 拖拽由页面标记承担（不需要任何主进程代码），RPC 只服务三个窗口控制按钮。
 * 输入 / 前置：任何可运行的 electrobun 工程（hello-world 布局，views 构建入口为
 * src/mainview/index.ts）。先把本课范例归位：titlebar-rpc.ts → src/shared/types.ts、
 * titlebar-view.html → src/mainview/index.html、titlebar-view.ts → src/mainview/index.ts。
 * 操作：本文件作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：无标题栏窗口出现；按住标题栏空白或标题文字拖动 = 移动窗口；
 * 三个圆点按钮分别关闭 / 最小化 / 最大化-还原；按住按钮拖动窗口不动（no-drag）。
 * 阅读主线：拖拽本身零代码——标记在 HTML 里；这里只写窗口与按钮的 RPC 处理器。
 */
import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { TitlebarRPCType } from "../shared/types";

const win = new BrowserWindow({
	title: "自绘标题栏",
	url: "views://mainview/index.html",
	frame: { width: 520, height: 360, x: 200, y: 160 },
	// 无标题栏、无原生控件：拖拽与窗口按钮全部由页面承担（见 titlebar-view.html）
	titleBarStyle: "hidden",
	// 默认 webview 的 RPC 通道：视图侧 electroview.rpc.send.* 调到这里
	rpc: BrowserView.defineRPC<TitlebarRPCType>({
		handlers: {
			messages: {
				closeWindow: () => win.close(),
				minimizeWindow: () => win.minimize(),
				toggleMaximize: () =>
					win.isMaximized() ? win.unmaximize() : win.maximize(),
			},
		},
	}),
});
