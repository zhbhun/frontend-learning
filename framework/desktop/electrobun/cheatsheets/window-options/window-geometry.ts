/**
 * 演示内容：frame 四分量的初始几何语义，以及运行时 setSize / setPosition / setFrame /
 * getFrame 的效果与终端读数。
 * 输入 / 前置：任何可运行的 electrobun 工程（如 1.3 课程的 hello-world）。
 * 操作：把本文件内容作为主进程入口（src/bun/index.ts）后运行 bun start，观察窗口
 * 变化与终端输出。
 * 预期结果：窗口按初始 frame 出现；1 秒后尺寸改为 600×400（左上角不动）；再 1 秒后
 * 移动到 (150, 150)；最后 setFrame 一次性改位置 + 尺寸；每步的 getFrame() 读数打印
 * 在终端，可与窗口实际位置核对。
 * 阅读主线：几何由 frame 四分量决定；运行时三个 setter 与一个 getter 覆盖全部需求，
 * getFrame() 每次从原生窗口读取并刷新实例内部缓存。
 */
import { BrowserWindow } from "electrobun/bun";

const win = new BrowserWindow({
	title: "窗口几何",
	url: "views://mainview/index.html",
	// x / y：窗口左上角在屏幕上的位置（屏幕左上角为原点）；width / height：初始尺寸
	frame: { x: 300, y: 200, width: 800, height: 600 },
});

const log = (step: string) => {
	// getFrame() 从原生窗口读取当前几何，并同步刷新 win.frame 缓存
	console.log(step, JSON.stringify(win.getFrame()));
};

log("初始 frame：");

setTimeout(() => {
	win.setSize(600, 400); // 只改尺寸，左上角保持不动
	log("setSize(600, 400) 后：");
}, 1000);

setTimeout(() => {
	win.setPosition(150, 150); // 只改位置
	log("setPosition(150, 150) 后：");
}, 2000);

setTimeout(() => {
	win.setFrame(100, 100, 700, 500); // 位置 + 尺寸一次设置，比分开调用更高效
	log("setFrame(100, 100, 700, 500) 后：");
}, 3000);
