/**
 * 演示内容：枚举显示器（id/bounds/workArea/scaleFactor/isPrimary）、bounds 与
 * workArea 的差（菜单栏/Dock 占用）、把窗口依次居中到每台显示器 workArea、
 * getCursorScreenPoint 的 bounds 命中判定，以及移动后 getFrame() 读数的核对。
 * 输入 / 前置：任何可运行的 electrobun 工程（如 1.3 课程的 hello-world），
 * 其 views://mainview/index.html 已按 electrobun.config.ts 装配完成。
 * 操作：把本文件内容作为主进程入口（src/bun/index.ts）后运行 bun start（或 bun run dev）。
 * 预期结果：启动打印显示器清单与「菜单栏/Dock 占用高度」；窗口先落在主屏
 * workArea 中央，之后每 2 秒移到下一台显示器并打印目标坐标、getFrame() 实际
 * 读数、两者差值与光标所在屏；单屏机器上窗口保持在主屏、每轮打印同一坐标。
 * 阅读主线：placeInWorkArea / displayAt 就是正文的两条定位算式；「差」一列是
 * 观察点——macOS 副屏与主屏逻辑高度不同且窗口已在副屏时，差值会等于两屏高度差
 * （源码级行为，见课程「常见问题」），其余情况下差值应为 0。
 */
import { BrowserWindow, Screen, type Display } from "electrobun/bun";

const WINDOW_WIDTH = 640;
const WINDOW_HEIGHT = 400;

// 定位算式一：窗口左上角 = 目标显示器 workArea 中央（用 workArea 而不是 bounds，
// 避免压到菜单栏 / Dock / 任务栏）
function placeInWorkArea(display: Display): { x: number; y: number } {
	return {
		x: Math.round(
			display.workArea.x + (display.workArea.width - WINDOW_WIDTH) / 2,
		),
		y: Math.round(
			display.workArea.y + (display.workArea.height - WINDOW_HEIGHT) / 2,
		),
	};
}

// 定位算式二：光标所在屏 = bounds 命中测试，未命中回退主屏
function displayAt(x: number, y: number): Display {
	return (
		Screen.getAllDisplays().find((d) => {
			const b = d.bounds;
			return x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height;
		}) ?? Screen.getPrimaryDisplay()
	);
}

// 启动快照：枚举一次并打印（热插拔感知靠重新查询，本范例不轮询布局）
const displays = Screen.getAllDisplays();
console.log(`检测到 ${displays.length} 台显示器：`);
for (const d of displays) {
	console.log(
		`  id=${d.id} ${d.isPrimary ? "主屏" : "副屏"}` +
			` bounds=${d.bounds.width}x${d.bounds.height}@(${d.bounds.x},${d.bounds.y})` +
			` workArea=${d.workArea.width}x${d.workArea.height}@(${d.workArea.x},${d.workArea.y})` +
			` scaleFactor=${d.scaleFactor}`,
	);
}

const primary = Screen.getPrimaryDisplay();
console.log(
	`getPrimaryDisplay → id=${primary.id}` +
		`；菜单栏/Dock 占用 = bounds.height - workArea.height = ${primary.bounds.height - primary.workArea.height}`,
);

// 窗口按主屏 workArea 中央开场
const start = placeInWorkArea(primary);
const win = new BrowserWindow({
	title: "屏幕探测",
	url: "views://mainview/index.html",
	frame: { x: start.x, y: start.y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
});

// 每 2 秒轮换显示器：setPosition 落位 → getFrame 核对 → 打印光标所在屏
let index = 0;
const timer = setInterval(() => {
	const target = displays[index % displays.length];
	const goal = placeInWorkArea(target);
	win.setPosition(goal.x, goal.y);
	const actual = win.getFrame();
	const cursor = Screen.getCursorScreenPoint();
	const hovered = displayAt(cursor.x, cursor.y);
	console.log(
		`显示器 id=${target.id}：目标 (${goal.x}, ${goal.y})` +
			`；getFrame=(${Math.round(actual.x)}, ${Math.round(actual.y)})` +
			`（差 ${Math.round(actual.x - goal.x)}, ${Math.round(actual.y - goal.y)}）` +
			`；光标 (${Math.round(cursor.x)}, ${Math.round(cursor.y)}) 所在屏 id=${hovered.id}`,
	);
	index += 1;
}, 2000);

// 窗口关闭后停掉轮换，避免继续向已销毁的窗口 setPosition
win.on("close", () => clearInterval(timer));
