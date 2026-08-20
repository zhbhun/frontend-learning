/**
 * 演示内容：通知与对话框的视图侧接线——「删除」按钮发起 rpc.request.confirmDelete
 * （等按钮索引回来再生效），「模拟下载完成」按钮发起 rpc.send.notifyFinished
 * （不等结果，状态行自行更新）。
 * 输入 / 前置：放到 src/mainview/index.ts（构建后自动注入 index.html）。
 * 操作：点草稿行的「删除」，在原生对话框里点「删除 / 取消」或按 Esc；点「模拟下载完成」。
 * 预期结果：对话框点「删除」后列表项移除；点「取消」/ Esc 列表不动；点「模拟下载完成」
 * 系统弹通知横幅、状态行更新。对话框停留超过 1 秒不会报超时——maxRequestTime
 * 已在 defineRPC 里关闭。
 * 阅读主线：confirmDelete 的 await 就是「视图在等用户做决定」；两个 try/catch 里
 * 只有 request 需要（超时 / 通道断开都以 reject 传回调用方）。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { Electroview } from "electrobun/view";
import type { NotificationsDialogsRPC } from "../shared/types";

const electroview = new Electroview({
	rpc: Electroview.defineRPC<NotificationsDialogsRPC>({
		// 等对话框的 request 不能用默认 1000ms 超时：用户看着对话框发呆就会
		// reject（RPC request timed out），迟到的按钮索引会被丢弃
		maxRequestTime: Infinity,
		handlers: {
			// 视图侧没有要实现的方法或接收的消息（webview 分支是空契约）
			requests: {},
			messages: {},
		},
	}),
});

const status = document.querySelector("#status");

// 对话框路径：request 拿回 { response }，按索引生效
document.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((btn) => {
	btn.addEventListener("click", async () => {
		const row = btn.closest("li");
		const target = btn.dataset.delete ?? "";
		try {
			const { response } = await electroview.rpc.request.confirmDelete({ target });
			if (response === 0) {
				row?.remove(); // 索引 0 =「删除」；其余索引（取消）什么都不做
			}
		} catch (error) {
			// 超时（没关 Infinity 的话）或通道异常会走到这里
			console.error("confirmDelete 失败:", error);
		}
	});
});

// 通知路径：send 单向消息，不等任何返回
document.querySelector("#simulate")?.addEventListener("click", () => {
	electroview.rpc.send.notifyFinished({ file: "electrobun.dmg" });
	if (status) {
		status.textContent = `状态：下载完成 · ${new Date().toLocaleTimeString()}`;
	}
});
