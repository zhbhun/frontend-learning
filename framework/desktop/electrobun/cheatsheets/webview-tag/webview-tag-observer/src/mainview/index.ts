// 宿主页面：给两个 <electrobun-webview> 接上事件订阅与导航/可见性控制。
// 事件的 detail 形态：dom-ready / did-navigate 一族是字符串（URL），
// host-message / new-window-open 是已解析的对象——record() 按类型分别展示。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { WebviewTagElement } from "electrobun/view";

const remote = document.querySelector(
	"electrobun-webview.remote",
) as WebviewTagElement;
const child = document.querySelector(
	"electrobun-webview.child",
) as WebviewTagElement;
const log = document.getElementById("log")!;

function record(source: string, name: string, detail: unknown) {
	const line = document.createElement("div");
	const text =
		typeof detail === "string" ? detail : JSON.stringify(detail) ?? "";
	line.textContent = `[${source}] ${name} ${text}`;
	log.prepend(line);
}

// 宿主页面侧的事件通道：tag.on() 收到的是框架 emit 出来的 CustomEvent
for (const [tag, label] of [
	[remote, "remote"],
	[child, "child"],
] as Array<[WebviewTagElement, string]>) {
	tag.on("dom-ready", (e) => record(label, "dom-ready", e.detail));
	tag.on("did-navigate", (e) => record(label, "did-navigate", e.detail));
	tag.on("did-navigate-in-page", (e) =>
		record(label, "did-navigate-in-page", e.detail),
	);
	tag.on("host-message", (e) => record(label, "host-message", e.detail));
	tag.on("new-window-open", (e) => record(label, "new-window-open", e.detail));
}

// 方法在标签初始化完成前调用会被静默忽略（实现里有 webviewId === null 守卫），
// 需要初始化后立即生效的操作挂到 dom-ready：
// 先全禁再放行 electrobun.dev，规则自上而下、最后命中的胜出
remote.on("dom-ready", () => {
	remote.setNavigationRules(["^*", "*://electrobun.dev/*"]);
	record("remote", "action", "已设置导航白名单：仅放行 *://electrobun.dev/*");
});

const state = document.getElementById("remote-state")!;
document.querySelector(".bar")!.addEventListener("click", (event) => {
	const act = (event.target as HTMLElement).dataset.act;
	if (!act || !remote) return;
	if (act === "reload") remote.reload();
	if (act === "back") remote.goBack();
	if (act === "forward") remote.goForward();
	if (act === "transparent") remote.toggleTransparent();
	if (act === "passthrough") remote.togglePassthrough();
	state.textContent = `transparent=${remote.transparent} passthrough=${remote.passthroughEnabled}`;
});
