// 系统工具观察台：Utils 路径与系统能力的最小可运行全景。
// 演示内容：启动时把 Utils.paths 十五个 getter 与 PATHS.RESOURCES_FOLDER /
// VIEWS_FOLDER 的真实解析结果打印到终端并渲染进窗口；应用菜单的每个动作项
// 触发一个 Utils 能力（openExternal / openPath / showItemInFolder /
// openFileDialog / moveToTrash / 剪贴板三件套 / Dock 图标开关 / app.quit），
// 结果全部回打终端。
// 运行：cd cheatsheets/paths-and-utils/utils-observer && bun install && bun start（macOS + Bun）。
// 预期结果：窗口是只读路径报告（表格里是本机真实值）；每个菜单动作在启动终端
//   打印一行结果；删除类动作（moveToTrash）只作用于本应用自己在 temp 里创建的
//   演示文件。
// 阅读主线：pathsReport 是路径侧的唯一真源；菜单 action 的分发集中在一个
//   Electrobun.events.on("application-menu-clicked") 回调里。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { join } from "node:path";
import { ApplicationMenu, BrowserWindow, PATHS, Utils, app } from "electrobun/bun";
import Electrobun from "electrobun/bun";

// ---- 路径侧：一张表说清所有路径入口在本机的真实值 ----

const pathsReport: Array<[string, string]> = [
	["Utils.paths.home", Utils.paths.home],
	["Utils.paths.temp", Utils.paths.temp],
	["Utils.paths.appData", Utils.paths.appData],
	["Utils.paths.config", Utils.paths.config],
	["Utils.paths.cache", Utils.paths.cache],
	["Utils.paths.logs", Utils.paths.logs],
	["Utils.paths.documents", Utils.paths.documents],
	["Utils.paths.downloads", Utils.paths.downloads],
	["Utils.paths.desktop", Utils.paths.desktop],
	["Utils.paths.pictures", Utils.paths.pictures],
	["Utils.paths.music", Utils.paths.music],
	["Utils.paths.videos", Utils.paths.videos],
	["Utils.paths.userData", Utils.paths.userData],
	["Utils.paths.userCache", Utils.paths.userCache],
	["Utils.paths.userLogs", Utils.paths.userLogs],
	["PATHS.RESOURCES_FOLDER", PATHS.RESOURCES_FOLDER],
	["PATHS.VIEWS_FOLDER", PATHS.VIEWS_FOLDER],
];

console.log("[paths] 本机解析结果：");
for (const [name, value] of pathsReport) {
	console.log(`  ${name.padEnd(28)} ${value}`);
}
console.log(
	'[paths] 应用私有目录的 identifier / channel 两段来自 ../Resources/version.json：identifier=dev.learn.utils，channel=dev（electrobun dev 的构建产物实测写 dev）',
);

// ---- 窗口：把同一份报告渲染出来（只读，交互都在菜单栏） ----

const reportRows = pathsReport
	.map(
		([name, value]) =>
			`<tr><td><code>${name}</code></td><td>${value}</td></tr>`,
	)
	.join("");

new BrowserWindow({
	title: "系统工具观察台",
	html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>系统工具观察台</title>
<style>
  body { margin: 0; background: #f8fafc; color: #172033;
         font-family: system-ui, -apple-system, sans-serif; }
  header { padding: 18px 24px 10px; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  header p { color: #475569; line-height: 1.6; margin: 0; font-size: 13px; }
  table { border-collapse: collapse; margin: 0 24px 20px; width: calc(100% - 48px);
          background: #fff; border: 1px solid #dbe3f0; border-radius: 8px;
          overflow: hidden; font-size: 12.5px; }
  td { border-bottom: 1px solid #eef2f8; padding: 5px 12px; }
  td:last-child { font-family: ui-monospace, Menlo, monospace; color: #334155; }
  code { font-family: ui-monospace, Menlo, monospace; color: #172033; }
</style></head>
<body>
<header>
  <h1>系统工具观察台</h1>
  <p>下表是本机真实解析值（getter 只返回字符串，目录不会自动创建）。
  所有系统能力在屏幕顶部菜单栏的「打开」「文件与剪贴板」「Dock」菜单里触发，
  结果打印在启动终端。</p>
</header>
<table>
  ${reportRows}
</table>
</body>
</html>`,
	frame: { width: 760, height: 620, x: 200, y: 140 },
});

// ---- 系统能力侧：菜单动作 → Utils 调用 → 终端回打 ----

let tempDemoFile: string | null = null;

ApplicationMenu.setApplicationMenu([
	{
		submenu: [
			{ label: "关于工具台", role: "about" },
			{ type: "separator" },
			{ label: "退出（app.quit）", action: "quit" },
		],
	},
	{
		label: "打开",
		submenu: [
			{ label: "openExternal：打开文档站", action: "open-external" },
			{ label: "openPath：打开下载文件夹", action: "open-downloads" },
			{ label: "showItemInFolder：定位 version.json", action: "reveal-version-json" },
			{ label: "openFileDialog：选择文件", action: "pick-files" },
		],
	},
	{
		label: "文件与剪贴板",
		submenu: [
			{ label: "先创建 temp 演示文件", action: "make-temp-file" },
			{ label: "moveToTrash：丢进废纸篓", action: "trash-temp-file" },
			{ type: "separator" },
			{ label: "clipboardWriteText：写入时间戳", action: "clipboard-write" },
			{ label: "clipboardReadText：读取", action: "clipboard-read" },
			{ label: "clipboardAvailableFormats：可用格式", action: "clipboard-formats" },
		],
	},
	{
		label: "Dock",
		submenu: [{ label: "切换 Dock 图标可见性（仅 macOS）", action: "toggle-dock" }],
	},
]);

Electrobun.events.on("application-menu-clicked", (e: unknown) => {
	const { action } = (e as { data: { action: string } }).data;
	switch (action) {
		case "open-external": {
			const ok = Utils.openExternal("https://framework.blackboard.sh/electrobun/");
			console.log(`[openExternal] 用默认浏览器打开文档站 → 返回 ${ok}`);
			break;
		}
		case "open-downloads": {
			const ok = Utils.openPath(Utils.paths.downloads);
			console.log(`[openPath] ${Utils.paths.downloads} → 返回 ${ok}`);
			break;
		}
		case "reveal-version-json": {
			// PATHS.RESOURCES_FOLDER 是绝对路径：resolve("../Resources/")
			const target = join(PATHS.RESOURCES_FOLDER, "version.json");
			Utils.showItemInFolder(target);
			console.log(`[showItemInFolder] 在 Finder 中定位 ${target}（无返回值）`);
			break;
		}
		case "pick-files": {
			Utils.openFileDialog({
				startingFolder: Utils.paths.home,
				allowedFileTypes: "*", // 多个扩展名写成 "png,jpg"
				canChooseFiles: true,
				canChooseDirectory: false,
				allowsMultipleSelection: false,
			}).then((picked: string[]) => {
				console.log(
					`[openFileDialog] 返回数组 ${JSON.stringify(picked)}（直接取消时是 [""]，包内没有特判）`,
				);
			});
			break;
		}
		case "make-temp-file": {
			tempDemoFile = join(Utils.paths.temp, "utils-observer-demo.txt");
			Bun.write(tempDemoFile, "被 moveToTrash 丢进废纸篓的演示文件\n").then(() => {
				console.log(`[Bun.write] 已创建演示文件 ${tempDemoFile}`);
			});
			break;
		}
		case "trash-temp-file": {
			if (!tempDemoFile) {
				console.log("[moveToTrash] 先用上一项创建演示文件");
				break;
			}
			const ok = Utils.moveToTrash(tempDemoFile);
			console.log(
				`[moveToTrash] ${tempDemoFile} → 返回 ${ok}（macOS 废纸篓不提供「放回原处」，只能手动拖回）`,
			);
			tempDemoFile = null;
			break;
		}
		case "clipboard-write": {
			const text = `utils-observer @ ${new Date().toLocaleTimeString()}`;
			Utils.clipboardWriteText(text);
			console.log(`[clipboardWriteText] 写入 ${JSON.stringify(text)}`);
			break;
		}
		case "clipboard-read": {
			const text = Utils.clipboardReadText();
			console.log(
				`[clipboardReadText] 读取 ${
					text === null ? "null（剪贴板里没有文本）" : JSON.stringify(text)
				}`,
			);
			break;
		}
		case "clipboard-formats": {
			console.log(
				`[clipboardAvailableFormats] ${JSON.stringify(Utils.clipboardAvailableFormats())}`,
			);
			break;
		}
		case "toggle-dock": {
			const visible = Utils.isDockIconVisible();
			Utils.setDockIconVisible(!visible);
			console.log(`[Dock] isDockIconVisible ${visible} → ${!visible}`);
			break;
		}
		case "quit": {
			console.log("[quit] app.quit()：先发 before-quit，再做原生清理");
			app.quit();
			break;
		}
		default:
			break;
	}
});

// 退出前事件：响应 { allow: false } 可以取消退出（Utils.quit 的第一道闸门）。
Electrobun.events.on("before-quit", (e) => {
	console.log("[before-quit] 收到退出前事件——打开下一行可以取消本次退出");
	// e.response = { allow: false };
});
