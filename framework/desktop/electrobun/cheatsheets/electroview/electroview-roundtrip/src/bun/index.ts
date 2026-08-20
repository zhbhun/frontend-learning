// Electroview 往返观察台（bun 侧）：BrowserView.defineRPC 定义本侧入口，
// 把 rpc 传给 BrowserWindow（挂在窗口自带的 webview 上）。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import { BrowserWindow, BrowserView, Socket } from "electrobun/bun";
import type { RoundtripRPC } from "../shared/rpc";

// import electrobun/bun 时 RPC socket 服务已经在跑：
// 从 50000 起找第一个可用端口，等视图侧 Electroview 来连。
console.log(
	`[bun] RPC socket 服务已就绪：ws://localhost:${Socket.rpcPort}/socket`,
);

const rpc = BrowserView.defineRPC<RoundtripRPC>({
	// 默认 1000ms 对冷启动偏紧，官方示例的取值是 5000
	maxRequestTime: 5000,
	handlers: {
		requests: {
			logAndEcho: ({ label }) => {
				console.log(`[bun] 收到视图 request logAndEcho(${label})`);
				return { receivedAt: new Date().toISOString(), label };
			},
		},
		messages: {
			viewReady: ({ webviewId, windowId, socketPort }) => {
				console.log(
					`[bun] 视图就绪：webviewId=${webviewId} windowId=${windowId} socketPort=${socketPort}`,
				);
				console.log(
					`[bun] 视图报的 socketPort 与主进程一致：${socketPort === Socket.rpcPort}`,
				);
				// 反向通道：bun 主动给视图发一条单向消息
				rpc.send.bunSays({
					text: `bun 收到就绪消息（webviewId=${webviewId}），反向通道已通`,
				});
			},
		},
	},
});

const win = new BrowserWindow({
	title: "Electroview 往返观察台",
	url: "views://view/index.html",
	frame: { width: 680, height: 520, x: 200, y: 200 },
	rpc,
});

console.log(`[bun] 窗口已创建：windowId=${win.id}，自带 webviewId=${win.webviewId}`);
