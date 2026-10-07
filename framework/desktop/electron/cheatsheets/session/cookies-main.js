/**
 * cookies 管理参考实现：get / set / remove 三件套、写盘时机与变化监听。
 *
 * 前置状态：依赖 Electron 运行时；cookie 挂在会话上，下面的操作都在
 * persist:work 分区会话里做（与「分区」范例共用同一份档案）。
 * 运行方式：放进 Forge 项目的 src/ 替换 index.js，npm start 观察终端日志。
 *
 * 预期结果：终端先打印上次留下的 cookie（重启后仍可读到，证明持久化），
 * 再演示写入、按 url + name 删除，并监听 changed 事件；最后 flushStore
 * 把 cookie 立刻写盘。
 *
 * 阅读主线：查询 → 写入（url 必填、expirationDate 决定寿命）→ 删除 →
 * 变化监听 → 写盘时机。
 */
const { app, session } = require('electron');

const SITE = 'https://electronjs.org';

async function demo() {
  const jar = session.fromPartition('persist:work').cookies;

  // 查：filter 字段全部可选，返回 Promise<Cookie[]>
  const kept = await jar.get({ name: 'course' });
  console.log('上次留下的 cookie：', kept.map((c) => `${c.name}=${c.value}`));

  // 写：url 必填且必须是有效 http(s) 地址（file:// 等无域名地址会 reject）；
  // 省略 expirationDate 得到会话 cookie，只存内存、重启即消失
  await jar.set({
    url: SITE,
    name: 'course',
    value: 'session',
    // domain 会被自动规范化为前导点：子域名也带上；省略则只对 url 的 host 生效
    domain: '.electronjs.org',
    secure: true,
    httpOnly: true,
    sameSite: 'lax', // 默认值
    expirationDate: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // UNIX 秒
  });
  console.log('写入完成：', (await jar.get({ url: SITE })).map((c) => c.name));

  // 删：url + name 定位一条 cookie；demo 里留着不删，方便重启验证
  // await jar.remove(SITE, 'course');

  // 监听变化：cause 取 explicit / overwrite / expired / evicted 等，
  // removed 为 true 表示这条 cookie 被移除（登录态失效的常见监听点）
  jar.on('changed', (_event, cookie, cause, removed) => {
    console.log(`cookie ${cookie.name} ${removed ? '移除' : '变更'}（${cause}）`);
  });

  // 写盘不即时：每 30 秒或累计 512 次操作才落盘，要立刻落盘就 flushStore
  await jar.flushStore();
}

app.whenReady().then(async () => {
  await demo();
  // 正常退出（而不是强杀），保证未落盘的数据走完退出流程
  app.quit();
});
