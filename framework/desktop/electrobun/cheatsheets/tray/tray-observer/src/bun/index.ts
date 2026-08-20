// 托盘观察台：常驻托盘应用的最小完整形态。
// 演示内容：Tray 构造（title/image/template/尺寸）→ tray-clicked 事件（图标点击
// action 为空串、菜单项点击带 action 与 data）→ 状态化菜单重建（checkbox、
// enabled 门控、divider、tooltip）→ 关窗不退出 + 按需重建窗口 + app.quit()。
// 运行：cd cheatsheets/tray/tray-observer && bun install && bun start（macOS + Bun）。
// 预期结果：菜单栏右侧出现托盘项；每次交互在终端打印一行事件日志；
//   关闭主窗口后应用与托盘仍在，托盘菜单「显示主窗口」可重建窗口，「退出」结束应用。
// 阅读主线：menuState 是菜单的唯一真源；updateTrayMenu() 每次全量重建；
//   tray.on("tray-clicked") 里按 action 分发。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow, Tray, Utils, app } from "electrobun/bun";
import Electrobun from "electrobun/bun";

// 菜单状态：勾选与门控都从这两个布尔推导，改状态后必须重建菜单才可见
const menuState = {
	"auto-update": false,
	"hide-dock-icon": false,
};

const tray = new Tray({
	// 文本与图标可以同时存在；title 也常用于状态文案（见下方 setTitle）
	title: "托盘观察台",
	// views:// 地址：文件已由 electrobun.config.ts 的 build.copy 装配进 views/
	image: "views://tray-assets/tray-icon-16-template.png",
	// template: true（默认）让 macOS 用 alpha 通道渲染单色图标并自适应明暗
	template: true,
	width: 16,
	height: 16,
});

// 主窗口引用：close 后置空，「显示主窗口」时按需重建
let win: BrowserWindow | null = createWindow();

function createWindow() {
	const created = new BrowserWindow({
		title: "托盘观察台",
		// 内联 html 开窗，省去 views 装配，聚焦托盘本身
		html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>托盘观察台</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #f8fafc; color: #172033;
         font-family: system-ui, -apple-system, sans-serif; }
  main { text-align: center; max-width: 26em; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  p { color: #475569; line-height: 1.7; margin: 0; }
</style></head>
<body><main>
  <h1>托盘观察台</h1>
  <p>关掉这个窗口试试——应用不会退出，托盘仍在菜单栏。
  托盘菜单里的「显示主窗口」会重建它；每次托盘交互都会在启动终端里打印事件日志。</p>
</main></body>
</html>`,
		frame: { width: 520, height: 300, x: 200, y: 160 },
	});
	// close 事件不可取消：窗口必然销毁；常驻形态靠配置不退出 + 之后重建
	created.on("close", () => {
		console.log("[window] close——窗口已销毁，应用继续运行（exitOnLastWindowClosed: false）");
		win = null;
	});
	return created;
}

// 菜单是全量替换而不是原地修改：每次都用最新 menuState 重建整份配置
let setMenuCount = 0;
function updateTrayMenu() {
	setMenuCount++;
	tray.setMenu([
		{
			type: "normal",
			label: "自动更新",
			action: "auto-update",
			checked: menuState["auto-update"],
			tooltip: "勾选状态由 menuState 驱动，切换后重建菜单生效",
		},
		{
			type: "normal",
			label: "自动更新开启后可用",
			action: "advanced",
			// enabled 门控：状态没到位时菜单项灰显，点击不触发事件
			enabled: menuState["auto-update"],
		},
		{ type: "divider" },
		{
			type: "normal",
			label: "显示主窗口",
			action: "show-main",
			// data 任意载荷：点击时随事件原样回到 handler（e.data.data）
			data: { window: "main" },
		},
		{
			type: "normal",
			label: "隐藏 Dock 图标",
			action: "hide-dock-icon",
			checked: menuState["hide-dock-icon"],
		},
		{ type: "normal", label: "退出", action: "quit" },
	]);
	console.log(`[setMenu] 第 ${setMenuCount} 次重建菜单`);
}

updateTrayMenu();

// 1.18.1 中 handler 收到的是 ElectrobunEvent 实例（文档标注 TODO: events should
// be typed），载荷在 .data：{ id, action, data }
tray.on("tray-clicked", (event) => {
	const { id, action, data } = (
		event as { data: { id: number; action: string; data?: unknown } }
	).data;
	console.log(
		`[tray-clicked] id=${id} action=${JSON.stringify(action)} data=${JSON.stringify(data) ?? "undefined"}`,
	);

	// action 为空串 = 点击的是托盘图标本身：按最新状态重建菜单
	if (action === "") {
		updateTrayMenu();
		return;
	}

	switch (action) {
		case "auto-update":
			menuState["auto-update"] = !menuState["auto-update"];
			// setTitle 常用来把状态顶到托盘文本上
			tray.setTitle(
				menuState["auto-update"] ? "托盘观察台 · 更新开" : "托盘观察台",
			);
			break;
		case "show-main":
			if (!win) {
				win = createWindow();
				console.log("[window] 已重建主窗口");
			} else {
				win.show();
			}
			break;
		case "hide-dock-icon":
			menuState["hide-dock-icon"] = !menuState["hide-dock-icon"];
			// macOS 菜单栏应用形态：藏掉 Dock 图标，应用只从托盘可达
			Utils.setDockIconVisible(!menuState["hide-dock-icon"]);
			break;
		case "quit":
			app.quit();
			break;
	}

	// 菜单项点击同样以重建收尾，勾选/门控的下次打开即可见
	updateTrayMenu();
});

// 全局订阅：与上面的 tray.on 是同一事件、两条通道；全局先触发，
// 多托盘时在这里靠 data.id 区分是哪一个
Electrobun.events.on("tray-clicked", (event) => {
	const { id, action } = (event as { data: { id: number; action: string } }).data;
	console.log(`[global:tray-clicked] 托盘 ${id} action=${JSON.stringify(action)}`);
});

console.log("托盘观察台已启动：点击菜单栏托盘项交互，看本终端输出");
