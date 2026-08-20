/**
 * 演示内容：Vite 集成下主进程如何决定窗口加载哪个 URL——先判运行通道，再探活
 * Vite dev server：dev 通道且 5173 可达时窗口直连 dev server 获得热更新，
 * 否则回退 copy 装配的打包产物；canary / stable 产物连探测都不做。
 * 输入/前置：vite.config.ts 固定 server.port（5173）并开 strictPort；
 *   electrobun.config.ts 的 build.copy 已把 dist 装配到 views/mainview/。
 * 操作：作为 src/bun/index.ts 的启动段运行（vite-tester 工程即此形态：
 *   bun run dev:hmr 双进程，或 bun run start 一次性构建启动）。
 * 预期结果：dev + dev server 运行 → 窗口加载 http://localhost:5173，改视图
 *   源码即时生效；其余情况 → 加载 views://mainview/index.html 打包产物。
 * 阅读主线：getMainViewUrl() 是唯一决策函数，「先通道后探活」的顺序就是
 *   生产安全边界——分发产物永远不访问 localhost。
 */
import { BrowserWindow, Updater } from "electrobun/bun";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const BUNDLED_URL = "views://mainview/index.html";

async function getMainViewUrl(): Promise<string> {
  // 通道来自应用包 Resources/version.json：dev / canary / stable。
  // 只有 dev 产物才考虑 dev server，同一份代码跑分发产物时无需改动
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      // 探活：连不上（没跑 dev server / 端口被占）就回退打包产物
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log(
        "Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
      );
    }
  }
  return BUNDLED_URL;
}

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
  title: "Vite + Electrobun",
  url,
  frame: { width: 900, height: 700, x: 200, y: 200 },
});
