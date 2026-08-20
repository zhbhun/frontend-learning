// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// app.identifier 会写进构建产物 Resources/version.json，成为
// Utils.paths.userData / userCache / userLogs 的中段目录名。
// 窗口用内联 html 渲染路径报告，不需要 views 构建与 copy 装配。
export default {
	app: {
		name: "utils-observer",
		identifier: "dev.learn.utils",
		version: "0.0.1",
	},
} satisfies ElectrobunConfig;
