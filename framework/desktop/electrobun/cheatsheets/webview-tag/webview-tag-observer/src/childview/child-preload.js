// 子 webview 的用户 preload：在页面脚本之前注入（由标签的 preload 属性指定，
// 以 views:// 引用构建时 copy 进 bundle 的这份文件）。
// 职责：把页面派发的 to-host 事件经 __electrobunSendToHost 转成宿主的
// host-message 事件（detail 为已解析的对象）。
window.addEventListener("to-host", (event) => {
	if (window.__electrobunSendToHost) {
		window.__electrobunSendToHost(event.detail);
	}
});
