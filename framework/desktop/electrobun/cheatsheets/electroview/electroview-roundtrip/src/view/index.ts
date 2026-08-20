// Electroview 往返观察台（视图侧）：三步初始化——共享类型 →
// Electroview.defineRPC（实现本侧入口）→ new Electroview({ rpc })
// （把 rpc 接到加密 socket 通道上）。随后读全局属性并演示双向通信。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun
// 依赖，@ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除。
// @ts-nocheck
import { Electroview } from "electrobun/view";
import type { RoundtripRPC } from "../shared/rpc";

const log = (html: string) => {
	const line = document.createElement("div");
	line.innerHTML = html;
	document.querySelector("#log")!.append(line);
};

// —— 第 0 步：全局属性读数（preload 注入，不依赖 Electroview）——
document.querySelector("#globals")!.textContent = [
	`window.__electrobunWebviewId = ${window.__electrobunWebviewId}`,
	`window.__electrobunWindowId = ${window.__electrobunWindowId}`,
	`window.__electrobunRpcSocketPort = ${window.__electrobunRpcSocketPort}`,
].join("\n");

// —— 第 1、2 步：defineRPC 实现视图侧入口，交给 Electroview 构造 ——
const rpc = Electroview.defineRPC<RoundtripRPC>({
	handlers: {
		messages: {
			// bun → 视图的单向消息
			bunSays: ({ text }) => log(`bun → 视图 send：<b>${text}</b>`),
		},
	},
});
const electroview = new Electroview({ rpc });

// —— 第 3 步：双向通信 ——
// 视图 → bun：单向消息上报就绪状态（触发 bun 反向下发）
rpc.send.viewReady({
	webviewId: window.__electrobunWebviewId,
	windowId: window.__electrobunWindowId,
	socketPort: window.__electrobunRpcSocketPort,
});
log("视图 → bun send：<code>viewReady</code>（已带全局属性读数）");

// 视图 → bun：request 等返回值
document.querySelector("#ping")!.addEventListener("click", () => {
	electroview.rpc.request
		.logAndEcho({ label: "ping" })
		.then(({ receivedAt }) =>
			log(
				`request 返回：<code>receivedAt=${receivedAt}</code>（视图 → bun → 视图一圈走完）`,
			),
		)
		.catch((err) => log(`request 失败：${String(err)}`));
});
