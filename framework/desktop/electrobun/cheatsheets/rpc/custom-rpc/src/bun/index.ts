// 主进程侧：defineRPC 声明 bun 分支的处理函数，再把 rpc 实例传给 BrowserWindow。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { AppRPC } from "../shared/rpc-schema";

const rpc = BrowserView.defineRPC<AppRPC>({
	// 管本实例发出的请求（bun → 视图方向）的超时；不配置时默认 1000ms
	maxRequestTime: 5000,
	handlers: {
		requests: {
			// 视图可调用：参数与返回值类型都由 AppRPC 的 bun 分支推导
			addNumbers: ({ a, b }) => ({ sum: a + b }),
		},
		messages: {
			// 视图可发送：主进程标准输出就在启动它的终端里
			logToBun: ({ msg }) => console.log("[bun]", msg),
		},
	},
});

const win = new BrowserWindow({
	title: "自定义 RPC",
	url: "views://mainview/index.html",
	// 不传 rpc 的话，BrowserView 会自建一个 handlers 为空的 rpc，
	// 上面这份 handlers 永远接不上通道
	rpc,
});

// bun → 视图方向要等页面就绪：视图侧接收函数在页面脚本执行
// new Electroview 时才挂上，太早发的包会被丢弃
win.webview.on("dom-ready", () => {
	win.webview.rpc.send.logToWebview({ msg: "主进程已就绪" });
	win.webview.rpc.request.getViewportSize().then((size) => {
		console.log("[bun] 视图尺寸", size);
	});
});

console.log("[bun] custom-rpc 已启动");
