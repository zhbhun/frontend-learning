// 视图脚本：src/mainview/index.ts 经 build.views.mainview 转译为
// views://mainview/index.js，被 index.html 引用后在页面里执行。
const status = document.querySelector("#status");

if (status) {
	status.textContent = "视图脚本已加载：views://mainview/index.js";
}
