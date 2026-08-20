// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// 观察台只用内联 html 开窗口，没有 views 构建与 copy，
// 主进程入口沿用默认 src/bun/index.ts，因此整个 build 段都可以省略。
export default {
	app: {
		name: "window-events-observer",
		identifier: "dev.learn.windowevents",
		version: "0.0.1",
	},
} satisfies ElectrobunConfig;
