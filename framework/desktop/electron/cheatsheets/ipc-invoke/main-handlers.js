/**
 * 双向调用的主进程参考实现（src/index.js 的 handler 部分）。
 * 演示：注册集中与启动时一次、handler 的事件参数、跨进程错误约定、
 *       handleOnce 一次性接单与 removeHandler 主动卸载。
 * 前置：本文件是 src/index.js 的节选；app、ipcMain 来自 require('electron')，
 *       readSetting / writeSetting / markOnboardingDone 为占位函数，替换为真实实现。
 * 阅读主线：先看 registerIpcHandlers 的注册清单，再逐个看 handler 的写法。
 */

// 注册集中在一个函数里、模块顶层只调用一次：
// - 注册先于任何窗口加载页面，首次 invoke 前通道必然就绪；
// - 开发期主进程热重载重跑模块时，不会因重复登记抛
//   Attempted to register a second handler。
function registerIpcHandlers() {
  // 最小往返：handler 的返回值就是渲染端 Promise resolve 的值
  ipcMain.handle('app:version', () => app.getVersion());

  // 事件参数：event.sender 是发起调用的 WebContents，多窗口时用它分辨来源
  ipcMain.handle('settings:get', (event, key) => {
    if (key !== 'theme') {
      // 跨进程错误只保留 message：判断所需的信息要压进 message
      throw new Error(`配置键不存在: ${key}`);
    }
    return readSetting(key);
  });

  // 结果对象约定：不抛错，把错误语义放进数据，渲染端按 ok 字段分流
  ipcMain.handle('settings:set', (event, key, value) => {
    if (typeof value !== 'string') {
      return { ok: false, reason: 'VALUE_MUST_BE_STRING' };
    }
    writeSetting(key, value);
    return { ok: true };
  });

  // 一次性接单：处理完自动移除，适合只发生一次的交互
  ipcMain.handleOnce('onboarding:ack', () => {
    markOnboardingDone();
    return true;
  });
}

registerIpcHandlers();

// 动态卸载：移除后该通道的 invoke 会以 No handler registered 拒绝；
// 需要覆盖旧 handler 时，也先 removeHandler 再 handle。
// ipcMain.removeHandler('settings:set');
