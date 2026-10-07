/**
 * e2e 配置示例：playwright.config.ts 只管端到端测试，单元测试归 Vitest 自己的配置。
 * 要点：不配 webServer——electron.launch 自己拉起被测应用，没有 dev server 要等；
 *   config 里 webServer 的 command 是浏览器测试起 dev server 用的，对 Electron 无效。
 * 前置：被测应用已完成打包语义构建（npx electron-forge package）。
 * 运行：npx playwright test（Linux CI 上用 xvfb-run 包一层）。
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // e2e 用例目录；单元测试（*.test.ts）不放在这里，由 Vitest 发现
  testDir: './tests/e2e',
  // 真实应用比浏览器测试慢（launch 本身默认就有 30s 超时），放宽单用例预算
  timeout: 60_000,
  // CI 上的偶发失败重试一次；本地不重试，问题要当场暴露
  retries: process.env.CI ? 1 : 0,
});
