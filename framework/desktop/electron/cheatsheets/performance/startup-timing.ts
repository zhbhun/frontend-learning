/**
 * 范例介绍：main 进程的启动计时与内存观测埋点（回查用完整示例）。
 *
 * 演示内容：在启动时间线的关键节点记录耗时，并周期性打印进程家族清单。
 * 前置状态：「接入 TypeScript」一课的 Forge + Vite + TS 项目；本文件作为 main.ts
 *   的埋点骨架，窗口加载路径以所用模板为准。
 * 主要操作：正常启动应用；再开、关第二个窗口观察 Tab 条目增减。
 * 预期结果：终端依次打出 ready 与 ready-to-show 的耗时；每 5 秒一组进程清单，
 *   至少含 Browser / Tab / GPU 三类，内存读数为该进程工作集（KB）。
 * 阅读主线：t0 → ready（main 关键路径开销）→ ready-to-show（渲染端首帧开销）；
 *   两段读数的差值决定优化该进「精简 main」还是「渲染端首屏」。
 */
import { app, BrowserWindow, Menu } from 'electron';

// 不需要默认菜单时，ready 前抑制——官方 checklist 列出的启动收益项
Menu.setApplicationMenu(null);

// 进程启动即开始计时：performance 是 Node.js 全局对象
const t0 = performance.now();

void app.whenReady().then(() => {
  logTiming('ready');

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    show: false, // 白屏治理：等 ready-to-show 再显示
    webPreferences: {
      // preload 路径以所用模板为准
    },
  });

  mainWindow.once('ready-to-show', () => {
    logTiming('ready-to-show'); // 与 ready 的差值 = 渲染端加载并画出首帧的耗时
    mainWindow.show();

    // 非关键初始化延后到窗口可见之后：更新检查、统计上报都不影响首帧
    setImmediate(() => {
      // checkForUpdates();
      // initTelemetry();
    });
  });

  void mainWindow.loadFile('index.html');

  // 每 5 秒打印进程家族清单：type / pid / 工作集内存（KB）
  // 渲染进程的 type 是 Tab；开第二个窗口多一条 Tab，销毁并清引用后消失
  setInterval(() => {
    for (const m of app.getAppMetrics()) {
      console.log(
        m.type.padEnd(8),
        `pid=${m.pid}`,
        `内存≈${m.memory.workingSetSize} KB`,
        `创建于 ${new Date(m.creationTime).toISOString()}`,
      );
    }
  }, 5000);
});

function logTiming(mark: string): void {
  console.log(mark, Math.round(performance.now() - t0), 'ms');
}
