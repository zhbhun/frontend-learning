// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "hello-world",
		identifier: "dev.learn.firstwindow",
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
	},
} satisfies ElectrobunConfig;
