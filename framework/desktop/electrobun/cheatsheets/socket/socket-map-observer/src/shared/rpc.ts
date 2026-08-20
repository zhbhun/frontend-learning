// 共享 RPC 类型：bun 与视图两侧 import 同一份文件。
// 本课的主角不是 RPC 本身（见「自定义 RPC」一课），这里只借一次
// request + 一次 send 证明：socket 登记为 OPEN 期间，两个方向的
// 业务消息都从这条加密连接过。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import type { RPCSchema } from "electrobun/bun";

export type SocketObserverRPC = {
	// 在主进程执行的入口：视图侧用 electroview.rpc.request 调用
	bun: RPCSchema<{
		requests: {
			// 视图发序号，bun 回时间戳，同时反向下发一条单向消息
			ping: {
				params: { n: number };
				response: { ok: boolean; at: string };
			};
		};
	}>;
	// 在视图上下文执行的入口：bun 侧用 win.webview.rpc.send 调用
	webview: RPCSchema<{
		messages: {
			// bun 收到 ping 后主动推给视图的单向消息
			pinged: { n: number };
		};
	}>;
};
