// GpuWindow 观察台的主进程：不创建任何 webview，只用 GpuWindow + webgpu 适配器
// 在原生 GPU 表面上跑清屏色动画。全部可观察证据打在启动终端上：
// Dawn 库解析结果、窗口与视图 id、adapter/device 就绪、resize 重配、关闭退出。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { GpuWindow, WGPU, webgpu } from "electrobun/bun";

// 证据 1：Dawn 动态库是否加载成功。找不到库时后续 createContext 会失败，
// 所以先在这里给出可定位的终端输出再退出。
if (!WGPU.native.available) {
	console.error(
		"[wgpu] 未找到 Dawn 动态库：确认对应平台段已开 bundleWGPU，或设置 ELECTROBUN_WGPU_PATH 指向库文件",
	);
	console.error(
		"[wgpu] 解析顺序：ELECTROBUN_WGPU_PATH → cwd → MacOS → Resources → 可执行文件目录",
	);
	process.exit(1);
}
console.log(`[wgpu] Dawn 库：${WGPU.native.path}`);

// 证据 2：窗口与自动创建的全窗视图。GpuWindow 构造即自动 new 一个
// autoResize: true 的 WGPUView，窗口内容区就是 GPU 表面。
const win = new GpuWindow({
	title: "GpuWindow 观察台",
	frame: { width: 640, height: 480, x: 200, y: 120 },
});
console.log(
	`[wgpu] 窗口 id = ${win.id}，自带 WGPUView id = ${win.wgpuView.id}（autoResize = ${win.wgpuView.autoResize}）`,
);

// createContext 接受 GpuWindow 或 WGPUView，返回 { instance, surface, context }；
// 同一个视图重复调用会命中缓存。configure / getCurrentTexture 都在 context 上。
const surface = webgpu.createContext(win);
const context = surface.context;

// requestAdapter 不传参数时自动使用最近一次 createContext 建立的表面，
// 等价于 requestAdapter({ compatibleSurface: context })。
const adapter = await webgpu.navigator.requestAdapter();
const device = await adapter.requestDevice();
console.log("[wgpu] adapter / device 就绪");

function configureSurface(size: { width: number; height: number }) {
	context.configure({
		device,
		format: webgpu.navigator.getPreferredCanvasFormat(),
		alphaMode: "opaque",
		size,
	});
}
configureSurface(win.getSize());

// 证据 3：原生视图会随窗口自动铺满，但表面配置的宽高停留在 configure 时的值，
// 必须在 resize 事件里带 size 重配，否则画面按旧尺寸拉伸。
win.on("resize", (event) => {
	const { width, height } = event.data;
	configureSurface({ width, height });
	console.log(`[wgpu] resize → ${width}×${height}，表面已重配`);
});

// 帧循环：取纹理 → 编码 → 提交。适配器的 queue.submit() 会自动呈现最近一次
// getCurrentTexture() 的表面，因此这里不需要显式调用 context.present()。
setInterval(() => {
	const t = Date.now() / 1000;
	const encoder = device.createCommandEncoder();
	const pass = encoder.beginRenderPass({
		colorAttachments: [
			{
				view: context.getCurrentTexture().createView(),
				clearValue: {
					r: 0.15 + 0.15 * Math.sin(t),
					g: 0.2,
					b: 0.45 + 0.25 * Math.sin(t * 0.7),
					a: 1,
				},
				loadOp: "clear",
				storeOp: "store",
			},
		],
	});
	pass.end();
	device.queue.submit([encoder.finish()]);
}, 16);

// 这个应用只有这一个窗口：默认 runtime.exitOnLastWindowClosed: true 时，
// 最后一个窗口（含 GpuWindow）关闭后框架会自动 quit()。这里先在窗口专属
// close 事件里落盘日志，再显式 process.exit(0)（框架已重写它以触发原生
// 清理），让退出行为不依赖该配置。
win.on("close", () => {
	console.log("[wgpu] 窗口关闭，主进程退出");
	process.exit(0);
});
