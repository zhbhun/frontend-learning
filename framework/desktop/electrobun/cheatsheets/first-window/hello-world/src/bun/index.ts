// 主进程：new BrowserWindow 时会创建原生窗口，并自动挂一个铺满窗口的默认
// webview，由它加载 url 指向的页面。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow } from "electrobun/bun";

const win = new BrowserWindow({
	title: "Hello, Electrobun!",
	url: "views://mainview/index.html",
	frame: { width: 800, height: 600, x: 200, y: 200 },
});

// 主进程的 stdout 就在启动它的终端里
console.log("hello-world 主进程已启动", win.id);
