// 两侧共享的 RPC 接口契约：bun / webview 分支各声明“这一侧处理什么”。
// 分支的 requests 由该侧实现（对端可调用），分支的 messages 由该侧接收（对端可发送）。
// RPCSchema 类型 electrobun/bun 与 electrobun/view 都有导出；type-only import 在
// 构建时被擦除，两侧入口都能引用这个文件。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { RPCSchema } from "electrobun/bun";

export type AppRPC = {
	// bun 分支：主进程实现 addNumbers、接收 logToBun（视图 → 主进程方向）
	bun: RPCSchema<{
		requests: {
			addNumbers: {
				params: { a: number; b: number };
				response: { sum: number };
			};
		};
		messages: {
			logToBun: { msg: string };
		};
	}>;
	// webview 分支：视图实现 getViewportSize、接收 logToWebview（主进程 → 视图方向）
	webview: RPCSchema<{
		requests: {
			// 无参数方法直接省略 params 键：调用侧 request.getViewportSize()
			// 与视图侧 handler 都不收参数
			getViewportSize: {
				response: { width: number; height: number };
			};
		};
		messages: {
			logToWebview: { msg: string };
		};
	}>;
};
