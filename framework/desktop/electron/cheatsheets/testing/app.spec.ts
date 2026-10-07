/**
 * 端到端示例：用 Playwright 的 _electron 拉起真实应用，验证「桥 + IPC + 界面」全链路。
 * 输入 / 前置：「接入 TypeScript」一课的 Forge + Vite + TS 工程，已用打包语义构建
 *   （npx electron-forge package）；页面展示应用信息，并有按钮触发 dialog.showOpenDialog。
 * 主要操作：beforeEach 拉起应用并取第一个窗口；stub 原生对话框 → 断言界面读数与
 *   主进程 evaluate 结果一致 → 点击「打开」验证 stub 生效 → afterEach 关闭应用。
 * 预期结果：界面读数等于主进程返回值；文件路径显示的是 stub 的固定值而不是真实弹窗。
 * 阅读主线：launch 选项 → 窗口即 Page → evaluate 内省 → 对话框 stub → tracing 回放。
 */
import { expect, test, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from 'playwright';

// 状态隔离靠新进程：每个用例独立 launch / close，不依赖用例执行顺序
let electronApp: ElectronApplication;
let window: Page;

test.beforeEach(async () => {
  // args: ['.'] —— 入口由 package.json 的 main 定位（.vite/build/main.cjs）
  electronApp = await electron.launch({ args: ['.'] });
  window = await electronApp.firstWindow();
});

test.afterEach(async () => {
  await electronApp.close();
});

test('应用信息链路：preload 桥 → IPC → 界面', async () => {
  // 界面背后的主进程状态：evaluate 在主进程里执行，参数是 require('electron') 的结果
  const version = await electronApp.evaluate(({ app }) => app.getVersion());

  // 断言穿透到主进程：界面读数必须与主进程返回值一致，防「界面恰好没刷新」的假阴性
  await expect(window.locator('#app-version')).toHaveText(version);
});

test('选择文件：stub 后的对话框返回固定路径', async () => {
  const context = electronApp.context();

  // tracing 记录每个动作的截图与 DOM 快照，失败后用 show-trace 回放
  await context.tracing.start({ screenshots: true, snapshots: true });

  // 原生对话框在主进程执行、Playwright 拦不到：测试里替换成固定返回值
  await electronApp.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: paths });
  }, ['/tmp/demo-notes.txt']);

  await window.getByRole('button', { name: '打开' }).click();
  await expect(window.locator('#file-path')).toHaveText('/tmp/demo-notes.txt');

  await context.tracing.stop({ path: 'test-results/trace.zip' });
});
