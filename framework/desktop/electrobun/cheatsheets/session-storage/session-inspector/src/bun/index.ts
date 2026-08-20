// 会话观察台：用 Session API 把「写入 → 过滤读取 → 删除 → 清空」跑一遍，
// 再对比 persist: 分区与裸名字分区在两次运行间的差异。
// Session 文档站没有专门页面，本工程把每一步的真实返回值都打到终端，
// 类型契约之外的细节以这里的实测输出为准。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { BrowserWindow, Session } from "electrobun/bun";

const win = new BrowserWindow({
	title: "会话观察台",
	// 用内联 html 开窗：窗口自带的 webview 固定落在 persist:default，
	// 页面只承担说明职责，Cookie 操作全部由主进程的 Session API 完成。
	html: `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8" /><title>会话观察台</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #f8fafc; color: #172033;
         font-family: system-ui, -apple-system, sans-serif; }
  main { text-align: center; max-width: 28em; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  p { color: #475569; line-height: 1.7; margin: 0; }
  code { font-family: ui-monospace, Menlo, monospace; }
</style></head>
<body><main>
  <h1>会话观察台</h1>
  <p>Cookie 的写入、过滤、删除与清空都在启动它的终端里打印。
  关掉窗口后再 <code>bun start</code> 一次，对比 <code>[5]</code> 两行：
  <code>persist:demo</code> 的计数递增，裸名字 <code>demo</code> 每次都从 1 开始。</p>
</main></body>
</html>`,
	frame: { width: 560, height: 400, x: 200, y: 200 },
});

// —— 第一幕：defaultSession 的 Cookie 读写（全部是同步调用）——
// defaultSession 就是 persist:default：窗口自带 webview 与未配置分区的
// BrowserView 共用的那份存储。
const jar = Session.defaultSession;
console.log(`[1] defaultSession.partition = ${jar.partition}`);

const setToken = jar.cookies.set({
	name: "token",
	value: "abc123",
	domain: "example.com",
	path: "/",
});
const setTheme = jar.cookies.set({
	name: "theme",
	value: "dark",
	domain: "example.com",
	path: "/",
});
console.log(`[1] set token → ${setToken}；set theme → ${setTheme}`);

console.log("[2] get()（无过滤，返回全部）→", jar.cookies.get());
console.log("[3] get({ name: 'token' }) →", jar.cookies.get({ name: "token" }));
console.log(
	"[3] get({ domain: 'example.com' }) →",
	jar.cookies.get({ domain: "example.com" }),
);

const removed = jar.cookies.remove("https://example.com", "theme");
console.log(
	`[4] remove('https://example.com', 'theme') → ${removed}；剩余 →`,
	jar.cookies.get({ domain: "example.com" }),
);

// —— 第二幕：分区持久化差异（跑两次对比 [5] 的两行输出）——
// readRuns：读出 runs 计数 Cookie，加一写回，返回新计数。
const readRuns = (partition: string) => {
	const session = Session.fromPartition(partition);
	const found = session.cookies.get({ name: "runs" });
	const next = (found.length ? Number(found[0].value) : 0) + 1;
	session.cookies.set({
		name: "runs",
		value: String(next),
		domain: "example.com",
		path: "/",
	});
	return next;
};
console.log(
	`[5] persist:demo 第 ${readRuns("persist:demo")} 次运行（重启后计数递增）`,
);
console.log(`[5] demo（裸名字）第 ${readRuns("demo")} 次运行（每次都从 1 开始）`);

// —— 第三幕：清理 ——
// 用独立分区演示，不碰 persist:demo 的计数 Cookie。
const clearJar = Session.fromPartition("persist:clear-demo");
clearJar.cookies.set({ name: "token", value: "x", domain: "example.com" });
console.log(
	"[6] clearStorageData(['cookies']) 前 →",
	clearJar.cookies.get({ domain: "example.com" }),
);
clearJar.clearStorageData(["cookies"]);
console.log(
	"[6] clearStorageData(['cookies']) 后 →",
	clearJar.cookies.get({ domain: "example.com" }),
);

jar.cookies.clear();
console.log("[7] cookies.clear() 清空 defaultSession 后 get() →", jar.cookies.get());

console.log(
	`观察完毕（窗口 id = ${win.id}）。再运行一次，重点对比 [5] 的两行计数。`,
);
