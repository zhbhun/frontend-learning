// three.js 变体：把 electrobun.config.ts 的 build.bun.entrypoint 换成
// "src/bun/three-scene.ts" 再 bun start。three 从 electrobun/bun 再导出
// （依赖由 electrobun 携带，无需自行安装）；canvas shim 用适配器自带的
// webgpu.utils.createCanvasShim(win)——它等价于手写一个 getContext("webgpu")
// 返回 createContext(win).context 的假 canvas。
// 边界：官方示例未处理窗口 resize——3D 库在内部持有设备句柄，1.18.1 的
// 适配器没有公开的按外部 device 重配表面的入口；拉伸窗口时画面保持初始宽高比。
// 本文件在 storybook 工作区内没有 electrobun 依赖，@ts-nocheck 让根工作区的
// 类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import { GpuWindow, WGPU, three, webgpu } from "electrobun/bun";

if (!WGPU.native.available) {
	console.error("[wgpu] 未找到 Dawn 动态库：开启 bundleWGPU 或设置 ELECTROBUN_WGPU_PATH");
	process.exit(1);
}

const win = new GpuWindow({
	title: "three.js + WebGPU",
	frame: { width: 800, height: 600, x: 200, y: 120 },
});

// 把适配器挂到全局 navigator.gpu：three 内部会按浏览器惯例探测它
webgpu.install();

const canvas = webgpu.utils.createCanvasShim(win);
const renderer = new three.WebGPURenderer({ canvas });
await renderer.init();

const scene = new three.Scene();
const camera = new three.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 100);
camera.position.z = 2;

// 标准材质需要灯光才可见（纯色 MeshBasicMaterial 除外）
scene.add(new three.AmbientLight(0xffffff, 0.6));
const light = new three.DirectionalLight(0xffffff, 2);
light.position.set(2, 3, 4);
scene.add(light);

const mesh = new three.Mesh(
	new three.BoxGeometry(0.6, 0.6, 0.6),
	new three.MeshStandardMaterial({ color: 0x4f7cff }),
);
scene.add(mesh);

console.log(`[three] 渲染器就绪，画布 ${canvas.width}×${canvas.height}`);

renderer.setAnimationLoop(() => {
	mesh.rotation.y += 0.01;
	mesh.rotation.x += 0.005;
	renderer.render(scene, camera);
});

win.on("close", () => process.exit(0));
