/**
 * 演示内容：上下文菜单的视图侧接线——contextmenu → preventDefault →
 * rpc.send.showMenu 把右键目标上报主进程；menuAction 消息回来后按 action
 * 应用效果。role 项不经过这条链路（原生直接作用于输入框）。
 * 输入 / 前置：放到 src/mainview/index.ts（构建后自动注入 index.html）。
 * 操作：右键标记区域，点击菜单项。
 * 预期结果：菜单在右键处弹出；action 项点击后页面更新；role 项直接编辑
 * 输入框内容，不经过这里的任何代码。
 * 阅读主线：上报只有三行；applyMenuAction 是 action 项在视图侧的唯一落点。
 */
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { Electroview } from "electrobun/view";
import type { ContextMenuRPC } from "../shared/types";

const electroview = new Electroview({
	rpc: Electroview.defineRPC<ContextMenuRPC>({
		handlers: {
			messages: {
				// 主进程把菜单点击发回来：{ action, data }（data 是构造菜单时挂的对象）
				menuAction: ({ action, data }) => applyMenuAction(action, data),
			},
		},
	}),
);

// 右键上报：preventDefault 后只发目标标识，菜单结构由主进程决定
document.querySelectorAll<HTMLElement>("[data-context]").forEach((el) => {
	el.addEventListener("contextmenu", (event) => {
		event.preventDefault();
		electroview.rpc.send.showMenu({ target: el.dataset.context ?? "" });
	});
});

function rowFor(target: string) {
	return document.querySelector<HTMLElement>(`[data-context="${target}"]`);
}

// action 项在视图侧的落点：按 action 路由，data 里带着右键时上报的目标
function applyMenuAction(action: string, data: { target?: string } | undefined) {
	const list = document.querySelector("#list");
	switch (action) {
		case "pin-item": {
			const row = data?.target ? rowFor(data.target) : null;
			if (row && list) list.prepend(row);
			break;
		}
		case "delete-item": {
			if (data?.target) rowFor(data.target)?.remove();
			break;
		}
		case "clear-all": {
			list?.replaceChildren();
			break;
		}
		case "insert-date": {
			const input = document.querySelector<HTMLInputElement>("#search");
			if (input) {
				input.value += ` · ${new Date().toISOString().slice(0, 10)}`;
			}
			break;
		}
	}
}
