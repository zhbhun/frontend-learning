// 子页面脚本：官方文档约定 __electrobunSendToHost 只在 preload 里使用，
// 页面脚本通过自定义事件把消息交给 child-preload.js 转发。
const ping = document.getElementById("ping")!;
ping.addEventListener("click", () => {
	window.dispatchEvent(
		new CustomEvent("to-host", {
			detail: { from: "childview", at: new Date().toISOString() },
		}),
	);
});
