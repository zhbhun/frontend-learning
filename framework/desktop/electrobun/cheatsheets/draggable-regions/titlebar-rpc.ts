/**
 * 演示内容：自绘标题栏与主进程之间的窗口控制 RPC schema——
 * 视图发 fire-and-forget 消息，主进程执行窗口操作。
 * 输入 / 前置：类型文件，无运行时行为。
 * 操作：复制到 electrobun 工程的 src/shared/types.ts（目录不存在就新建）。
 * 预期结果：titlebar-window.ts（bun 侧）与 titlebar-view.ts（视图侧）
 * 从这里导入同一份类型，两端消息名保持一致。
 * 阅读主线：bun 分支是主进程处理的消息；webview 分支本课为空。
 * RPC 的完整机制（schema、send/ask/handle、类型推导）见「自定义 RPC」一课。
 */
import type { RPCSchema } from "electrobun/bun";

export type TitlebarRPCType = {
	bun: RPCSchema<{
		messages: {
			closeWindow: {};
			minimizeWindow: {};
			toggleMaximize: {};
		};
	}>;
	webview: RPCSchema<{ requests: {}; messages: {} }>;
};
