// socketMap 观察台（视图侧）：构造 Electroview 触发 socket 连接，
// 按钮发起双向 RPC，重载按钮让本页连接关闭、新页连接覆盖登记表同 id 条目。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import { Electroview } from "electrobun/view";
import type { SocketObserverRPC } from "../shared/rpc";

const log = (html: string) => {
	const line = document.createElement("div");
	line.innerHTML = html;
	document.querySelector("#log")!.append(line);
};

// preload 注入的全局属性：连接地址就来自这两个读数
document.querySelector("#globals")!.textContent = [
	`window.__electrobunWebviewId = ${window.__electrobunWebviewId}`,
	`window.__electrobunWindowId = ${window.__electrobunWindowId}`,
	`window.__electrobunRpcSocketPort = ${window.__electrobunRpcSocketPort}`,
].join("\n");

// 构造 Electroview = 向 ws://localhost:{port}/socket?webviewId={id} 发起连接
const rpc = Electroview.defineRPC<SocketObserverRPC>({
	handlers: {
		messages: {
			pinged: ({ n }) => log(`bun → 视图 send：<code>pinged(${n})</code>`),
		},
	},
});
const electroview = new Electroview({ rpc });

let counter = 1;
document.querySelector("#ping")!.addEventListener("click", () => {
	const n = counter++;
	electroview.rpc.request
		.ping({ n })
		.then(({ at }) =>
			log(
				`request 返回：<code>ok · ${at}</code>（视图 → bun → 视图一圈走完，都在这条连接上）`,
			),
		)
		.catch((err) => log(`request 失败：${String(err)}`));
});

document.querySelector("#reload")!.addEventListener("click", () => {
	location.reload();
});
