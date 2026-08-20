/**
 * 演示内容：视图侧窗口控制按钮的 RPC 接线（Electroview.defineRPC + rpc.send）。
 * 输入 / 前置：放到 src/mainview/index.ts（electrobun.config.ts 的 views 构建入口，
 * 构建后自动注入 titlebar-view.html）。
 * 操作：窗口打开后按钮即已接线。
 * 预期结果：点击关闭 / 最小化 / 最大化按钮，主进程执行对应窗口操作
 * （处理器在 titlebar-window.ts）。
 * 阅读主线：RPC 只服务按钮；拖拽区域不需要任何视图脚本——
 * preload 的监听在页面加载前就已挂好。
 */
import { Electroview } from "electrobun/view";
import type { TitlebarRPCType } from "../shared/types";

// 标准视图初始化：建立加密 RPC 通道；视图侧不处理任何请求，handlers 留空
const electroview = new Electroview({
	rpc: Electroview.defineRPC<TitlebarRPCType>({ handlers: {} }),
});

document
	.querySelector<HTMLButtonElement>("#closeBtn")
	?.addEventListener("click", () => {
		electroview.rpc.send.closeWindow({});
	});

document
	.querySelector<HTMLButtonElement>("#minimizeBtn")
	?.addEventListener("click", () => {
		electroview.rpc.send.minimizeWindow({});
	});

document
	.querySelector<HTMLButtonElement>("#maximizeBtn")
	?.addEventListener("click", () => {
		electroview.rpc.send.toggleMaximize({});
	});
