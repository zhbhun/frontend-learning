/**
 * 参考实现：用 electron-log 建立主/渲染两端统一落盘的日志通道。
 *
 * 前置：npm install electron-log；在主进程入口（src/main.ts）最早处调用 setupLogger()，
 *       且早于创建任何窗口，渲染端的第一条日志才能送达。
 * 主线：log.initialize() 装好 IPC 桥（渲染端消息经此汇聚到主进程）→ 配置 file transport
 *       的级别与轮转 → startCatching() 兜住两端未捕获异常 → scope 按模块划分来源。
 * 预期：开发期终端与日志文件同时出现日志；打包后只剩日志文件
 *       （macOS ~/Library/Logs/<应用名>/main.log，路径可用 getFile().path 打印自证）。
 * 渲染端对应写法：import log from 'electron-log/renderer'; 之后直接 log.info(...)。
 */
import log from 'electron-log/main';

export function setupLogger(): void {
  // 渲染端之所以能 log，就是这一行在主进程装好了 IPC 桥；必须先于窗口创建
  log.initialize();

  // 文件传输默认级别 'silly'（全量），生产期收紧到 info：verbose 及以下不再写文件
  log.transports.file.level = 'info';

  // 单文件默认上限 1048576 字节（1 MB），写满后整体轮转为 main.old.log；0 表示不轮转
  log.transports.file.maxSize = 5 * 1024 * 1024;

  // 默认路径与 app.getPath('logs') 的默认目录一致，文件名 main.log。
  // 需要自定义位置时改 resolvePathFn；variables.electronDefaultDir 即 app.getPath('logs')：
  // log.transports.file.resolvePathFn = (variables) =>
  //   path.join(variables.electronDefaultDir, variables.fileName);

  // 兜住主进程与渲染进程的未捕获异常、未处理的 Promise rejection。
  // 注意：主进程与渲染进程要各自调用一次 startCatching（渲染端入口为 electron-log/renderer）
  log.errorHandler.startCatching({
    // 默认 true：仅主进程错误弹窗（沿用 Electron 逻辑），渲染端错误与 rejection 从不弹窗
    showDialog: false,
    onError({ error, processType, versions }) {
      // 返回 false 会跳过默认处理；这里保留默认写日志，只附加业务动作
      if (processType === 'renderer') return;
      log.error(`[${processType}] 未处理异常`, error, versions); // versions 含 app / electron / os
    },
  });

  // scope：按模块划分日志来源，输出形如 12:12:21.962 (ipc) › 日志通道就绪
  const ipcLog = log.scope('ipc');
  ipcLog.info('日志通道就绪');
}

/** 拿不到文件时用这一行自证实际路径（如贴进 issue 让用户执行） */
export function logFilePath(): string {
  return log.transports.file.getFile().path;
}
