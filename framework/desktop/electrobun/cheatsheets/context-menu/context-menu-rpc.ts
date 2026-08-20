/**
 * 演示内容：上下文菜单右键联动的 RPC 契约——视图 → 主进程的 showMenu
 * （上报右键目标标识）、主进程 → 视图的 menuAction（菜单点击动作与数据）。
 * 输入 / 前置：类型文件，无运行时行为。
 * 操作：复制到 electrobun 工程的 src/shared/types.ts（目录不存在就新建）。
 * 预期结果：context-menu-window.ts（bun 侧）与 context-menu-view.ts（视图侧）
 * 从这里导入同一份类型，两端消息名保持一致。
 * 阅读主线：bun 分支收 showMenu；webview 分支收 menuAction。RPC 的完整机制
 * （schema、send/ask/handle、类型推导）见「自定义 RPC」一课。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { RPCSchema } from "electrobun/bun";

export type ContextMenuRPC = {
	// bun 分支：主进程接收视图的右键通知（视图 → 主进程方向）
	bun: RPCSchema<{
		messages: {
			showMenu: { target: string };
		};
	}>;
	// webview 分支：视图接收菜单点击动作（主进程 → 视图方向）
	webview: RPCSchema<{
		messages: {
			menuAction: { action: string; data?: unknown };
		};
	}>;
};
