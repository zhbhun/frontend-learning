/**
 * 演示内容：主进程里一套可直接投产的最小自动更新流程——启动时检查、定时复查、
 *   状态事件订阅（含下载进度）与「就绪后再应用」的分离。
 * 输入/前置：把本文件内容并入 tester/src/bun/index.ts（hello-world 工程），
 *   且需要 canary / stable 构建才有意义：先用 `bunx electrobun build --env=canary`
 *   产出带真实 hash 的应用包，并在 electrobun.config.ts 配置 release.baseUrl
 *   指向已上传 artifacts/ 的静态托管（dev 通道会在 checkForUpdate 处直接短路）。
 * 操作：启动应用观察主进程日志；把远端 update.json 换成新版本的产物后，
 *   等待下一轮检查（或重启应用）。
 * 预期结果：日志依次输出 checking → update-available → 补丁链或全量下载状态
 *   （download-progress 带 percent）→ download-complete；确认 updateReady 后
 *   applyUpdate 退出应用、替换并重启为新版本。
 * 阅读主线：onStatusChange 是单回调订阅（后设覆盖，传 null 清除），先订阅再触发
 *   检查；downloadUpdate 成功后 updateInfo().updateReady 才为 true，applyUpdate
 *   以它为门控——把「是否现在退出并更新」的决定权留在业务侧。
 */
import { Updater } from "electrobun/bun";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 每 4 小时复查一次

// 1. 订阅状态事件：entry.status 是 UpdateStatusType，
//    entry.details.progress 是全量下载的百分比（补丁下载没有该字段）
Updater.onStatusChange((entry) => {
  const progress =
    entry.details?.progress !== undefined ? ` (${entry.details.progress}%)` : "";
  console.log(`[updater] ${entry.status}${progress}: ${entry.message}`);
});

// 2. 检查 → 下载；安装分离，把退出重启的时机留给策略或用户确认
async function pollUpdate(): Promise<void> {
  const info = await Updater.checkForUpdate();
  if (!info.updateAvailable) {
    return; // 已是最新；dev 通道在这里短路（no-update: Dev channel - updates disabled）
  }

  await Updater.downloadUpdate(); // 补丁链优先，断链自动回退全量包

  if (Updater.updateInfo()?.updateReady) {
    // 3. 应用更新：替换应用包并重启；Windows 上由计划任务在应用退出后完成替换
    await Updater.applyUpdate();
  }
}

pollUpdate();
setInterval(pollUpdate, CHECK_INTERVAL_MS);
