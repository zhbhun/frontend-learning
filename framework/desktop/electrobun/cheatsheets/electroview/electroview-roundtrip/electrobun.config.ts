// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// 一个 view：src/view/index.ts 由 electrobun 构建为 views://view/index.js，
// index.html 原样 copy 过去，窗口用 views://view/index.html 打开。
export default {
	app: {
		name: "electroview-roundtrip",
		identifier: "dev.learn.electroview",
		version: "0.0.1",
	},
	build: {
		views: {
			view: {
				entrypoint: "src/view/index.ts",
			},
		},
		copy: {
			"src/view/index.html": "views/view/index.html",
		},
	},
} satisfies ElectrobunConfig;
