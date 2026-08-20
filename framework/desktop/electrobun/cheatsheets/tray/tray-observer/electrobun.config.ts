// 本课程目录不是 Electrobun 工程本身，storybook 工作区未安装 electrobun 依赖，
// @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后可删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

// 常驻托盘应用的关键配置：runtime.exitOnLastWindowClosed 默认 true
// （最后一个窗口关闭即退出应用），这里显式关掉，让「关掉窗口、留住托盘」成立。
export default {
	app: {
		name: "tray-observer",
		identifier: "dev.learn.tray",
		version: "0.0.1",
	},
	runtime: {
		exitOnLastWindowClosed: false,
	},
	build: {
		// 托盘图标经 copy 装配进 views/，主进程里才能用 views:// 地址引用它
		copy: {
			"src/assets/tray-icon-16-template.png":
				"views/tray-assets/tray-icon-16-template.png",
		},
	},
} satisfies ElectrobunConfig;
