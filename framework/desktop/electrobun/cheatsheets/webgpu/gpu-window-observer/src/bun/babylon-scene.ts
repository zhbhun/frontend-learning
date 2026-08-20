// babylon 变体：把 electrobun.config.ts 的 build.bun.entrypoint 换成
// "src/bun/babylon-scene.ts" 再 bun start。@babylonjs/core 从 electrobun/bun
// 再导出；WebGPUEngine 吃同一个 canvas shim，但要先 await initAsync()。
// 输入边界：shim 的 addEventListener 是空实现，attachControl 收不到指针事件——
// GpuWindow 侧没有公开的指针输入 API，相机运动用渲染循环驱动代替交互。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { GpuWindow, WGPU, babylon, webgpu } from "electrobun/bun";

if (!WGPU.native.available) {
	console.error("[wgpu] 未找到 Dawn 动态库：开启 bundleWGPU 或设置 ELECTROBUN_WGPU_PATH");
	process.exit(1);
}

const win = new GpuWindow({
	title: "Babylon + WebGPU",
	frame: { width: 800, height: 600, x: 200, y: 120 },
});

webgpu.install();

const canvas = webgpu.utils.createCanvasShim(win);
const engine = new babylon.WebGPUEngine(canvas, { antialias: false });
await engine.initAsync();

const scene = new babylon.Scene(engine);
scene.clearColor = new babylon.Color4(0.12, 0.12, 0.14, 1);

const camera = new babylon.ArcRotateCamera(
	"camera",
	Math.PI / 4,
	Math.PI / 3,
	2.5,
	new babylon.Vector3(0, 0, 0),
	scene,
);
new babylon.HemisphericLight("light", new babylon.Vector3(0.4, 1, 0.6), scene);

const box = babylon.MeshBuilder.CreateBox("box", { size: 0.7 }, scene);
const mat = new babylon.StandardMaterial("mat", scene);
mat.diffuseColor = new babylon.Color3(0.3, 0.48, 1);
mat.specularColor = new babylon.Color3(0.4, 0.4, 0.5);
box.material = mat;

console.log(`[babylon] 引擎就绪，画布 ${canvas.width}×${canvas.height}`);

engine.runRenderLoop(() => {
	camera.alpha += 0.005; // shim 不转发指针事件，用循环驱动环绕
	scene.render();
});

win.on("close", () => process.exit(0));
