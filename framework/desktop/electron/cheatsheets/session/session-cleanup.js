/**
 * 清理参考实现：clearCache / clearStorageData / clearData 的分层选择。
 *
 * 前置状态：依赖 Electron 运行时；操作 persist:work 会话，清掉的只是这个
 * 分区里的数据，默认会话与其他分区不受影响。
 * 运行方式：放进 Forge 项目的 src/ 替换 index.js，npm start 观察终端日志。
 *
 * 预期结果：终端按层打印清理前后的 cookie 数量对照——clearCache 只清 HTTP
 * 缓存、cookie 数不变；clearStorageData 指定 cookies 后归零。
 *
 * 阅读主线：clearCache（缓存）→ clearStorageData（站点数据，可按类型与
 * origin 限定）→ clearData（全量）→ flushStorageData（立即落盘）。
 */
const { app, session } = require('electron');

const countCookies = async (ses) => (await ses.cookies.get({})).length;

async function demo() {
  const ses = session.fromPartition('persist:work');

  // 第一层：只清 HTTP 缓存（页面资源副本），不动 cookie 与 localStorage
  await ses.clearCache();
  console.log('clearCache 后 cookie 数：', await countCookies(ses));

  // 第二层：清站点数据，可按 origin 与类型限定；不传 options 则全部清掉
  await ses.clearStorageData({
    origin: 'https://electronjs.org', // 按 scheme://host:port 形式给出
    storages: ['cookies', 'localstorage', 'indexdb'],
  });
  console.log('clearStorageData 后 cookie 数：', await countCookies(ses));

  // 第三层：全量清（相当于「重置这个会话的网页状态」），按需选用
  // await ses.clearData();

  // DOMStorage（localStorage / IndexedDB）落盘有延迟，重要时机可主动写盘
  ses.flushStorageData();

  // 回查：clearAuthCache() 清认证缓存、clearCodeCaches() 清代码缓存
}

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:work');
  await ses.cookies.set({
    url: 'https://electronjs.org',
    name: 'course',
    value: 'demo',
    expirationDate: Math.floor(Date.now() / 1000) + 3600,
  });
  console.log('清理前 cookie 数：', await countCookies(ses));
  await demo();
  app.quit();
});
