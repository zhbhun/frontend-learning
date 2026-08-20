// GpuWindow 观察台的构建配置：整个应用没有任何 views——渲染全部发生在
// Bun 主进程的原生 GPU 表面上，这正是 bundleWGPU 路线的形态。
// 想看 three.js / babylon 变体时，把 build.bun.entrypoint 换成
// "src/bun/three-scene.ts" 或 "src/bun/babylon-scene.ts" 再运行。
// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "gpu-window-observer",
		identifier: "dev.learn.gpuwindow",
		version: "0.0.1",
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		// 三平台都把 Dawn 动态库捆进应用；不开启时运行时找不到库，
		// WGPU.native.available 会是 false。
		mac: { bundleWGPU: true },
		win: { bundleWGPU: true },
		linux: { bundleWGPU: true },
	},
} satisfies ElectrobunConfig;
