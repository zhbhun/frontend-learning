// 窗口事件观察台：创建一个窗口，订阅全部 7 个窗口事件，
// 把每次事件的 event.data 打到启动它的终端里。
// 事件 handler 的注册紧跟窗口创建，保证不漏掉窗口显示初期的 focus/resize。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow } from "electrobun/bun";
import Electrobun from "electrobun/bun";

const win = new BrowserWindow({
	title: "窗口事件观察台",
	// 用内联 html 开窗，省去 views 装配，聚焦窗口事件本身
	html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>窗口事件观察台</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #f8fafc; color: #172033;
         font-family: system-ui, -apple-system, sans-serif; }
  main { text-align: center; max-width: 26em; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  p { color: #475569; line-height: 1.7; margin: 0; }
  code { font-family: ui-monospace, Menlo, monospace; }
</style></head>
<body><main>
  <h1>窗口事件观察台</h1>
  <p>拖动窗口边缘改大小、拖标题栏移动、切换到别的应用再回来、按几个键、
  最后关闭窗口——每一步都会在启动它的终端里打印一行事件日志。</p>
</main></body>
</html>`,
	frame: { width: 520, height: 380, x: 200, y: 200 },
});

// BrowserWindow.on 的 handler 参数在 1.18.1 中类型是 unknown，
// 实际传入的是 ElectrobunEvent 实例，取 .data 即事件载荷
const dataOf = (event: unknown) => (event as { data: any }).data;

// close：窗口级 handler 先于全局逻辑执行，是放清理代码的位置
win.on("close", (event) => {
	console.log("[close]", dataOf(event));
});

// resize / move：拖动过程中连续触发，data 自带最新几何，无需再查询
win.on("resize", (event) => {
	const { x, y, width, height } = dataOf(event);
	console.log(`[resize] ${width}x${height} @ (${x}, ${y})`);
});
win.on("move", (event) => {
	const { x, y } = dataOf(event);
	console.log(`[move] @ (${x}, ${y})`);
});

// focus / blur：成为/失去 key window 时触发
win.on("focus", (event) => console.log("[focus]", dataOf(event)));
win.on("blur", (event) => console.log("[blur]", dataOf(event)));

// keyDown / keyUp：窗口级键盘事件；keyCode 为原生键码数值
win.on("keyDown", (event) => {
	const { keyCode, modifiers, isRepeat } = dataOf(event);
	console.log(`[keyDown] keyCode=${keyCode} modifiers=${modifiers} isRepeat=${isRepeat}`);
});
win.on("keyUp", (event) => {
	const { keyCode, modifiers, isRepeat } = dataOf(event);
	console.log(`[keyUp] keyCode=${keyCode} modifiers=${modifiers} isRepeat=${isRepeat}`);
});

// 全局订阅：与上面的窗口级订阅同源不同通道，靠 data.id 区分窗口
Electrobun.events.on("focus", (event) => {
	console.log(`[global:focus] 窗口 ${event.data.id} 聚焦`);
});

console.log(`观察台已启动（窗口 id = ${win.id}），对窗口做操作，看本终端输出`);
