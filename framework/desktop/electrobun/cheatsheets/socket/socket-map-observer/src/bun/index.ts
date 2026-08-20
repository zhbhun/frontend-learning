// socketMap 观察台（bun 侧）：主进程轮询 Socket.socketMap 并打印状态变化，
// 证据全部打在启动终端——服务的端口、条目何时出现、断开后条目保留、
// 页面重载后同 id 覆盖、视图移除后条目清空。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import { BrowserWindow, Socket } from "electrobun/bun";
import type { SocketObserverRPC } from "../shared/rpc";

// ① import electrobun/bun 的那一刻 RPC socket 服务已经在跑：
//    从 50000 起扫首个可用端口。下面这行只是把结果读出来。
console.log(`[bun] RPC socket 服务：ws://localhost:${Socket.rpcPort}/socket`);

const rpc = BrowserView.defineRPC<SocketObserverRPC>({
	// 默认 1000ms 对「页面加载 + socket 连接」的窗口期偏紧，调到 5000
	maxRequestTime: 5000,
	handlers: {
		requests: {
			ping: ({ n }) => {
				console.log(`[bun] 收到 ping(${n})——这条消息刚从加密 socket 进来`);
				// 反向通道：bun 主动给视图发一条单向消息（也走 socket）
				rpc.send.pinged({ n });
				return { ok: true, at: new Date().toISOString() };
			},
		},
	},
});

const win = new BrowserWindow({
	title: "socketMap 观察台",
	url: "views://view/index.html",
	frame: { width: 680, height: 480, x: 200, y: 200 },
	rpc,
});

// ② socketMap 状态观察：每 250ms 读一次，只在状态变化时打印一行。
//    条目在视图侧连接 open 时才创建（不是 BrowserView 构造时）；
//    断开后条目保留、socket 置 null；页面重载后同 id 被 新连接覆盖。
const readyStateLabel = (state: number): string =>
	state === 1 ? "OPEN" : state === 0 ? "CONNECTING" : state === 2 ? "CLOSING" : "CLOSED";

function describeSocketMap(): string {
	const ids = Object.keys(Socket.socketMap).sort((a, b) => Number(a) - Number(b));
	if (ids.length === 0) return "（空）";
	return ids
		.map((id) => {
			const entry = Socket.socketMap[id as keyof typeof Socket.socketMap];
			const socket = entry.socket
				? `socket=${readyStateLabel(entry.socket.readyState)}`
				: "socket=null";
			return `${id}: { ${socket}, queue: ${entry.queue.length} 项 }`;
		})
		.join("  ");
}

let lastSnapshot = "";
setInterval(() => {
	const snapshot = describeSocketMap();
	if (snapshot !== lastSnapshot) {
		lastSnapshot = snapshot;
		console.log(`[bun] socketMap → ${snapshot}`);
	}
}, 250);

console.log(
	`[bun] 窗口已创建：windowId=${win.id}，自带 webviewId=${win.webviewId}（等待视图侧连接）`,
);
console.log("[bun] 观察点：点视图里的按钮发 RPC；点「重载页面」看 close→open；关窗口看条目清空");
