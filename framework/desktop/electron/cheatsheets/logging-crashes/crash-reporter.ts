/**
 * 参考实现：崩溃感知与 minidump 上报的三层接线。
 *
 * 前置：setupCrashCollection() 必须在应用启动最早处调用——建议在 app.whenReady() 之前、
 *       先于创建任何窗口；晚于它启动的渲染进程不会被 crashReporter 监控。
 * 主线：crashReporter.start() 打开 minidump 收集与上传（环境信息放 globalExtra 才能覆盖
 *       渲染端崩溃）→ render-process-gone / child-process-gone 事件把"进程死亡"写进日志 →
 *       crashForTest() 用 process.crash() 制造一次真实崩溃验证整条链路。
 * 预期：崩溃报告落在 app.getPath('crashDumps')；配置了 submitURL 时以 multipart/form-data
 *       （minidump 在 upload_file_minidump 字段，请求体 gzip）POST 上传，服务端响应体成为报告 id。
 * 事件语义（reason / exitCode 分类与恢复动作）见「webContents」一课，此处只做接线。
 */
import { app, crashReporter } from 'electron';

import log from 'electron-log/main';

import { collectEnvInfo } from './env-info';

export function setupCrashCollection(options: { submitURL?: string } = {}): void {
  crashReporter.start({
    // 没有收集服务时省略 submitURL 并传 uploadToServer: false：报告仍会收集并保存在
    // 本地 crashDumps 目录（id 为空即未上传），用户可手动把文件发给你
    submitURL: options.submitURL,
    uploadToServer: Boolean(options.submitURL),
    // compress 默认 true：请求体带 Content-Encoding: gzip，服务端需能解压，或显式设 false
    // globalExtra：附加到所有进程（含最常崩的渲染进程）的崩溃报告；start 之后不可再改
    // 注意 extra 只进主进程崩溃报告，且 utilityProcess 没有附加参数的 API
    globalExtra: collectEnvInfo(),
  });

  // 渲染进程死亡：挂在 app 上一次收全部窗口；崩溃本身的 minidump 由上面 start() 另行收集
  app.on('render-process-gone', (_event, webContents, details) => {
    log.error('渲染进程退出', {
      reason: details.reason,
      exitCode: details.exitCode,
      url: webContents.getURL(),
    });
  });

  // 子进程（GPU、utility 等）意外消失：details.type 区分进程种类；不含渲染进程
  app.on('child-process-gone', (_event, details) => {
    log.error('子进程退出', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });
}

/**
 * 链路验证：仅用于开发构建（挂在一个 dev-only 的 IPC handle 或快捷键上）。
 * 让主进程主线程立即崩溃，模拟原生层崩溃：核对 crashDumps 目录出现新文件、
 * submitURL 服务端收到 POST。不要接入任何生产路径。
 */
export function crashForTest(): never {
  process.crash();
}
