/**
 * 演示内容：BrowserWindow 构造选项 titleBarStyle 三种取值的真实窗口外观差异，
 * 以及 trafficLightOffset 只在 macOS + hiddenInset 组合下生效。
 * 输入 / 前置：任何可运行的 electrobun 工程（如 1.3 课程的 hello-world），
 * 其 views://mainview/index.html 已按 electrobun.config.ts 装配完成。
 * 操作：把本文件内容作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：屏幕上并排出现三个 420×300 窗口——default 有原生标题栏；hidden 无标题栏
 * 也无任何原生控件；hiddenInset 标题栏透明、红绿灯悬浮在内容上且整体右移 70px。
 * 阅读主线：三个 new BrowserWindow 只差 titleBarStyle 与 trafficLightOffset 两项。
 */
import { BrowserWindow } from "electrobun/bun";

const url = "views://mainview/index.html";
const size = { width: 420, height: 300 };

// 1) default（缺省值）：原生标题栏 + 系统控件（关闭 / 最小化 / 缩放）
new BrowserWindow({
	title: "default",
	url,
	frame: { ...size, x: 40, y: 120 },
	titleBarStyle: "default",
});

// 2) hidden：无标题栏、无原生控件——外观全部由页面内容自绘。
// 这个窗口没有关闭按钮，退出用 ⌘Q，或关掉旁边还有控件的窗口
// （exitOnLastWindowClosed 默认 true，最后一个窗口关闭即退出应用）。
new BrowserWindow({
	title: "hidden",
	url,
	frame: { ...size, x: 480, y: 120 },
	titleBarStyle: "hidden",
});

// 3) hiddenInset：透明标题栏，内容延伸到标题栏下，红绿灯悬浮在内容左上。
// trafficLightOffset 在这里生效：红绿灯整体偏移 (70, 16)，给侧边导航腾出位置（仅 macOS）。
new BrowserWindow({
	title: "hiddenInset",
	url,
	frame: { ...size, x: 920, y: 120 },
	titleBarStyle: "hiddenInset",
	trafficLightOffset: { x: 70, y: 16 },
});
