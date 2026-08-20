// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "custom-rpc",
		identifier: "dev.learn.rpc",
		version: "0.0.1",
	},
	build: {
		// 主进程入口沿用默认 src/bun/index.ts，这里省略 build.bun 段
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
			},
		},
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
		},
		// src/shared/rpc-schema.ts 不需要出现在配置里：
		// 它只被两侧入口 import，随各自 bundle 一起构建
	},
} satisfies ElectrobunConfig;
