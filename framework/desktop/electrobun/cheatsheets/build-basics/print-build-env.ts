// 构建钩子范例：打印 Electrobun 注入给生命周期脚本的全部构建环境变量。
// 前置：工程内已安装 electrobun（本手册基准 1.18.1），存在 electrobun.config.ts。
// 用法：把本文件复制进工程（例如 scripts/print-build-env.ts），在 electrobun.config.ts
//   配置 scripts.preBuild 指向它，然后运行 bunx electrobun build。
// 预期：构建开始前，终端输出各 ELECTROBUN_* 变量在当前通道下的取值，例如
//   dev 通道下 ELECTROBUN_BUILD_ENV=dev、ELECTROBUN_APP_NAME=hello-world-dev；
//   改用 --env=canary 后，同名变量的取值随通道切换。

const buildEnvKeys = [
	"ELECTROBUN_BUILD_ENV",
	"ELECTROBUN_OS",
	"ELECTROBUN_ARCH",
	"ELECTROBUN_BUILD_DIR",
	"ELECTROBUN_APP_NAME",
	"ELECTROBUN_APP_VERSION",
	"ELECTROBUN_APP_IDENTIFIER",
	"ELECTROBUN_ARTIFACT_DIR",
] as const;

console.log("[print-build-env] Electrobun 注入的构建环境变量：");
for (const key of buildEnvKeys) {
	console.log(`  ${key} = ${process.env[key] ?? "（未注入）"}`);
}
