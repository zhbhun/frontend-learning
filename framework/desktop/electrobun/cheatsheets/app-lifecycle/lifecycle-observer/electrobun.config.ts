// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// 观察台演示常驻形态：关掉「最后一个窗口关闭即退出」，
// 这样关闭窗口后应用仍在（Dock 图标保留），点 Dock 图标才能触发 reopen。
// 观察台只用内联 html 开窗口，主进程入口沿用默认 src/bun/index.ts。
export default {
	app: {
		name: "lifecycle-observer",
		identifier: "dev.learn.lifecycle",
		version: "0.0.1",
	},
	runtime: {
		exitOnLastWindowClosed: false,
	},
} satisfies ElectrobunConfig;
