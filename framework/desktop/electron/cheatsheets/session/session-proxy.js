/**
 * 代理参考实现：setProxy 的 fixed_servers 写法、例外规则与恢复直连。
 *
 * 前置状态：依赖 Electron 运行时；示例用 127.0.0.1:8888 作代理地址，按实际
 * 环境修改。本机没有可用代理时，被代理的请求会失败——这只影响网络请求，
 * 不影响本脚本运行与代理解析结果。
 * 运行方式：放进 Forge 项目的 src/ 替换 index.js，npm start 观察终端日志。
 *
 * 预期结果：fixed_servers 模式下 resolveProxy 打印代理地址；恢复 direct 后
 * 打印 DIRECT。
 *
 * 阅读主线：mode 选型 → proxyRules 格式 → bypass 例外 → resolveProxy 验证
 * → 换代理后 closeAllConnections。
 */
const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:work');

  // fixed_servers：由 proxyRules 指定代理。给 pacScript 时默认 pac_script
  // 模式，否则（给了 proxyRules）默认 fixed_servers
  await ses.setProxy({
    mode: 'fixed_servers',
    // 协议=代理地址，分号分隔；逗号是故障转移（127.0.0.1:8888 失败改直连）
    proxyRules: 'http=127.0.0.1:8888,direct://',
    // 逗号分隔的例外规则；<local> 匹配 localhost / 127.0.0.1 / ::1
    proxyBypassRules: 'localhost,127.0.0.1,<local>',
  });
  console.log('http 的代理：', await ses.resolveProxy('http://electronjs.org'));

  // 恢复直连
  await ses.setProxy({ mode: 'direct' });
  console.log('direct 的代理：', await ses.resolveProxy('http://electronjs.org'));

  // 换代理后旧连接可能被连接池复用，需要立即生效时顺手断开：
  // await ses.closeAllConnections();

  const mainWindow = new BrowserWindow({ width: 800, height: 560 });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
});
