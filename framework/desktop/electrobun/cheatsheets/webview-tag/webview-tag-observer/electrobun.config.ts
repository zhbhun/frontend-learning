// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// 两个 views：mainview 是宿主页面（含 <electrobun-webview> 标签），
// childview 是被标签嵌入的本地子页面；child-preload.js 原样 copy 供
// 标签的 preload 属性以 views:// 引用。
export default {
	app: {
		name: "webview-tag-observer",
		identifier: "dev.learn.webviewtag",
		version: "0.0.1",
	},
	build: {
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
			},
			childview: {
				entrypoint: "src/childview/index.ts",
			},
		},
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
			"src/childview/index.html": "views/childview/index.html",
			"src/childview/child-preload.js": "views/childview/child-preload.js",
		},
	},
} satisfies ElectrobunConfig;
