// 带注释的完整配置模板：覆盖 electrobun.config.ts 的五个段落与三个平台段，
// 每段只保留常用形态，注释标注默认值与去向，可直接复制进真实工程删改。
// 前置：工程内已安装 electrobun（本手册基准 1.18.1）。
// 说明：本课程目录不是 Electrobun 工程，storybook 工作区未安装 electrobun 依赖，
//   @ts-nocheck 让根工作区的类型检查通过；复制到真实工程后删除下面这行。
// @ts-nocheck
import type { ElectrobunConfig } from "electrobun";

export default {
	// 应用元信息：name 影响产物命名（构建时去空格），identifier 是平台唯一标识，
	// version 写进 version.json；urlSchemes / fileAssociations 见课程「app 段」小节
	app: {
		name: "my-app",
		identifier: "dev.learn.myapp",
		version: "0.1.0",
	},

	build: {
		// 主进程构建：entrypoint 默认 "src/bun/index.ts"；其余选项原样透传 Bun.build
		bun: {
			entrypoint: "src/bun/index.ts",
			// minify: true,        // 压缩主进程产物（1.18.1 CLI 默认不压缩）
			// drop: ["console"],   // 移除 console.* 调用
		},

		// 视图构建：键即视图名（views:// 路径第一段），entrypoint 必填、无默认；
		// TS 全部交给 Vite 等外部工具时，整段省略、只靠 copy 装配 dist
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
				// define: { __APP_VERSION__: '"0.1.0"' },  // 编译期常量注入
			},
		},

		// 静态资源装配：源 → 目标映射，文件与目录都可以；
		// 目标以 "views/" 开头才有 views:// 地址
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
			"src/mainview/index.css": "views/mainview/index.css",
		},

		// 输出目录：默认 "build" / "artifacts"（后者仅 canary / stable 通道使用）
		buildFolder: "build",
		artifactFolder: "artifacts",

		// 额外监听目录（dev --watch）：共享代码等不在入口 / copy 源里的路径
		watch: ["src/shared"],

		// 监听排除：glob 匹配项目相对路径；
		// build/、artifacts/、node_modules/ 永远自动忽略，不用写在这里
		// watchIgnore: ["dist/**"],   // Vite 等外部构建产物的典型写法

		// 打包形态：默认不启用 asar；启用后匹配下方 glob 的原生文件解包到 app.asar.unpacked
		// useAsar: true,
		// asarUnpack: ["*.node", "*.dll", "*.dylib", "*.so"],

		// ICU 语言数据裁剪：子集如 ["en", "zh"] 可减小体积；仅 Linux / Windows 生效
		// locales: ["en", "zh"],

		// 平台段：三段同构（bundleCEF / bundleWGPU / defaultRenderer / chromiumFlags）
		mac: {
			bundleCEF: false,          // 捆绑 CEF 约 +100MB 量级；默认用系统 WKWebView
			bundleWGPU: false,         // WebGPU（Dawn）部件
			defaultRenderer: "native",
			// chromiumFlags: { "remote-debugging-port": "9333" },  // 仅 CEF 渲染消费
			// codesign / notarize / entitlements：见「代码签名」课
			// createDmg: true,        // 本地原型验证可关闭，省 DMG 生成时间
			// icons: "icon.iconset",  // 默认值；图标配置见「打包资源与图标」课
		},
		win: {
			bundleCEF: false,          // 不捆绑时用 WebView2
			bundleWGPU: false,
			defaultRenderer: "native",
			// icon: "assets/icon.ico",  // 建议含 16/32/48/256 多尺寸
		},
		linux: {
			bundleCEF: false,          // 不捆绑时用 GTKWebKit；高级层合成建议开启
			bundleWGPU: false,
			defaultRenderer: "native",
			// icon: "assets/icon.png",  // 建议 ≥256×256
		},
	},

	// 运行时行为：整段写入应用包 Resources/build.json，主进程用 BuildConfig.get() 读取；
	// 可加任意自定义键
	runtime: {
		exitOnLastWindowClosed: true,   // 托盘常驻应用设 false
		// featureFlags: { betaUi: true },
	},

	// 构建钩子：用宿主机 Bun 执行，注入 ELECTROBUN_* 环境变量（见「构建与分发入门」课）
	// scripts: {
	//   preBuild: "scripts/pre-build.ts",
	//   postBuild: "scripts/post-build.ts",
	//   postWrap: "scripts/post-wrap.ts",      // 仅 canary / stable 通道
	//   postPackage: "scripts/post-package.ts",
	// },

	// 分发：baseUrl 是静态托管根地址，未设置时跳过补丁生成（见「构建与分发入门」课）
	// release: {
	//   baseUrl: "https://your-bucket.example.com/myapp/",
	//   generatePatch: true,
	// },
} satisfies ElectrobunConfig;
