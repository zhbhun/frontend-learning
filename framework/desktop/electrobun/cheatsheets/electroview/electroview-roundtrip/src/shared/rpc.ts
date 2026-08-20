// 共享 RPC 类型：bun 与视图两侧 import 同一份文件，两侧的
// request/send 名称与参数形态都由它推导（官方推荐放在 src/shared/）。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import type { RPCSchema } from "electrobun/bun";

export type RoundtripRPC = {
	// 在主进程执行的入口：视图侧用 electroview.rpc.request 调用
	bun: RPCSchema<{
		requests: {
			// 请求-响应：视图发 label，bun 回 receivedAt 时间戳
			logAndEcho: {
				params: { label: string };
				response: { receivedAt: string; label: string };
			};
		};
		messages: {
			// 单向消息：视图就绪后把全局属性读数报给 bun
			viewReady: { webviewId: number; windowId: number; socketPort: number };
		};
	}>;
	// 在视图上下文执行的入口：bun 侧用 win.webview.rpc.send 调用
	webview: RPCSchema<{
		messages: {
			// 单向消息：bun 主动推给视图
			bunSays: { text: string };
		};
	}>;
};
