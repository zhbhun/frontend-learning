// 视图侧：defineRPC 声明 webview 分支的处理函数，new Electroview({ rpc }) 接上通道。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { Electroview } from "electrobun/view";
import type { AppRPC } from "../shared/rpc-schema";

function log(text: string) {
	const list = document.querySelector("#log");
	if (list) {
		const item = document.createElement("li");
		item.textContent = text;
		list.append(item);
	}
}

const rpc = Electroview.defineRPC<AppRPC>({
	handlers: {
		requests: {
			// 主进程可调用：把视口尺寸回给 bun
			getViewportSize: () => ({
				width: window.innerWidth,
				height: window.innerHeight,
			}),
		},
		messages: {
			// 主进程可发送：显示在页面日志列表里
			logToWebview: ({ msg }) => log(`[view] 收到消息：${msg}`),
		},
	},
});

// 关键一步：new Electroview 把 rpc 接到视图的传输通道上。
// 不执行这一步，rpc 只挂着占位传输层，request/send 会直接抛
// "transport did not provide ... send"
new Electroview({ rpc });

document.querySelector("#call-add")?.addEventListener("click", async () => {
	// 视图 → 主进程 request：await 拿到的就是 AppRPC 里声明的 response 类型
	const { sum } = await rpc.request.addNumbers({ a: 3, b: 4 });
	log(`addNumbers(3, 4) = ${sum}`);
});

document.querySelector("#send-log")?.addEventListener("click", () => {
	// 视图 → 主进程 send：单向通知，无返回值
	rpc.send.logToBun({ msg: "来自视图的问候" });
	log("已发送 logToBun（终端可见）");
});
