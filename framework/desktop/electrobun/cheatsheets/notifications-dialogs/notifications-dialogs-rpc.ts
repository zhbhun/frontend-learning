/**
 * 演示内容：通知与对话框视图侧联动的 RPC 契约——两种语义对应两种 RPC 形态：
 * confirmDelete 是 request（视图等主进程把用户点的按钮索引带回来），
 * notifyFinished 是 message（单向通知，不等结果）。
 * 输入 / 前置：类型文件，无运行时行为。
 * 操作：复制到 electrobun 工程的 src/shared/types.ts（目录不存在就新建）。
 * 预期结果：notifications-dialogs-bun.ts（bun 侧）与 notifications-dialogs-view.ts
 * （视图侧）从这里导入同一份类型，两端方法名保持一致。
 * 阅读主线：两个成员都写在 bun 分支——由主进程实现（requests）和接收（messages）；
 * RPC 的完整机制（schema、send / request、类型推导）见「自定义 RPC」一课。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { RPCSchema } from "electrobun/bun";

export type NotificationsDialogsRPC = {
	// bun 分支：主进程实现的有响应方法（视图用 rpc.request 调用，等按钮索引）
	bun: RPCSchema<{
		requests: {
			confirmDelete: {
				params: { target: string };
				response: { response: number };
			};
		};
		messages: {
			// 主进程接收的单向消息（视图用 rpc.send 发出，不等结果）
			notifyFinished: { file: string };
		};
	}>;
	// webview 分支：视图侧没有要实现的方法，也没有要接收的消息——
	// 不带泛型参数的 RPCSchema 就是空契约（ElectrobunRPCSchema 接口同款写法）
	webview: RPCSchema;
};
