/**
 * 参考实现（主进程）：shell 的调用收口在主进程，URL 校验只有这一份。
 * 输入：渲染端经 IPC 触发「打开网址」「打开文件」「显示所在文件夹」「移入废纸篓」；
 * 操作：先过协议白名单再 openExternal；openPath / showItemInFolder / trashItem 按返回形态判定成败；
 * 预期：http(s) 网址由默认浏览器打开，非白名单协议被拒绝且不触碰 openExternal；
 *       文件交给默认程序（失败不抛错，resolve 错误串）；删除走系统废纸篓，可还原；
 *       窗口内点外部链接一律不开应用内新窗口，校验后转交默认浏览器。
 * 阅读主线：shell 是把目标委托给操作系统——选哪个浏览器、哪个程序由用户系统决定；
 *           你能守住的是进 openExternal 的 URL 与每个方法的成败判定。
 */
const { shell, ipcMain } = require('electron');

/**
 * 官方安全清单第 15 条：不要用 openExternal 打开不可信内容——
 * "When openExternal is used with untrusted content, it can be leveraged
 * to execute arbitrary commands." 唯一防线在调用前：解析协议，白名单放行。
 */
function isSafeForExternalOpen(raw) {
  try {
    const url = new URL(raw);
    // 只比 protocol / origin，不做字符串开头匹配——
    // startsWith('https://example.com') 挡不住 https://example.com.attacker.com
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false; // new URL 解析失败：不是合法 URL，一律拒绝
  }
}

ipcMain.handle('shell:open-external', (_event, raw) => {
  if (!isSafeForExternalOpen(raw)) {
    return { ok: false, reason: '不支持的协议，已拒绝打开' };
  }
  return shell.openExternal(raw).then(
    () => ({ ok: true }),
    (error) => ({ ok: false, reason: String(error) }),
  );
});

ipcMain.handle('shell:open-path', async (_event, targetPath) => {
  // openPath 不抛错也不 reject：成功 resolve 空字符串，失败 resolve 错误信息
  const error = await shell.openPath(targetPath);
  return error ? { ok: false, reason: error } : { ok: true };
});

ipcMain.handle('shell:show-item-in-folder', (_event, fullPath) => {
  // 同步方法、无返回值、无错误反馈：适合路径可信且刚验证过的场景（如刚导出的文件）
  shell.showItemInFolder(fullPath);
  return { ok: true };
});

ipcMain.handle('shell:trash-item', async (_event, targetPath) => {
  // trashItem 失败以 reject 表达，用 try/catch 接住；路径用平台默认分隔符，
  // 拼接时用 path.resolve 生成绝对路径再传入
  try {
    await shell.trashItem(targetPath);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error) };
  }
});

/** 窗口内点外部链接（window.open / target="_blank"）的去处：
 *  webContents 创建新窗口前先经过 window open handler——一律 deny，
 *  http(s) 目标校验后转交默认浏览器。拦截机制的全貌见「导航与弹窗控制」。
 */
function forwardExternalLinks(webContents) {
  webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeForExternalOpen(url)) {
      // 官方安全清单第 14 条的示例写法：setImmediate 让拦截先返回，再发起打开
      setImmediate(() => shell.openExternal(url));
    }
    return { action: 'deny' };
  });
}

module.exports = { isSafeForExternalOpen, forwardExternalLinks };
