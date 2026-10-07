/**
 * 文件与对话框的主进程参考实现（src/index.js 的 handler 部分）。
 * 演示：打开 / 保存对话框的完整 handler、取消分支、对话框结果到 fs 读写的衔接、
 *       多选返回的 filePaths 数组，以及渲染端传来路径时的不可信输入校验。
 * 前置：本文件是 src/index.js 的节选；app、dialog、ipcMain 来自 require('electron')，
 *       node:fs/promises 与 node:path 需自行 require；注册惯例（集中、启动一次）见「双向调用」课。
 * 阅读主线：每个 handler 都是同一条链——对话框拿路径 → fs 干活 → 返回结果对象。
 */

const { app, dialog, ipcMain } = require('electron');
const { readFile, writeFile } = require('node:fs/promises');

function registerIpcHandlers() {
  // 打开文本文件：对话框只给路径，内容由 fs 读出后一起返回
  ipcMain.handle('dialog:openTextFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      defaultPath: app.getPath('documents'),
      filters: [{ name: '文本', extensions: ['txt', 'md'] }],
      properties: ['openFile'],
    });
    // 取消是正常分支：不抛错，用结果对象告诉渲染端
    if (canceled || filePaths.length === 0) {
      return { ok: false, reason: 'CANCELED' };
    }
    const content = await readFile(filePaths[0], 'utf8');
    return { ok: true, path: filePaths[0], content };
  });

  // 多选导入：multiSelections 时 filePaths 是数组，逐个处理
  ipcMain.handle('dialog:pickImages', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择图片',
      defaultPath: app.getPath('pictures'),
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || filePaths.length === 0) {
      return { ok: false, reason: 'CANCELED' };
    }
    // filters 只是界面提示：拿到路径后校验扩展名再做后续处理
    const images = filePaths.filter((p) => /\.(png|jpe?g)$/i.test(p));
    return { ok: true, paths: images };
  });

  // 保存文本：先让用户选位置，再写文件——对话框自己不创建、不写入文件
  ipcMain.handle('dialog:saveTextFile', async (event, content) => {
    if (typeof content !== 'string') {
      return { ok: false, reason: 'CONTENT_MUST_BE_STRING' };
    }
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存文本文件',
      // defaultPath 给到具体文件名，即预填的文件名
      defaultPath: '未命名.txt',
      filters: [{ name: '文本', extensions: ['txt'] }],
    });
    // 取消时 filePath 是空字符串
    if (canceled || !filePath) {
      return { ok: false, reason: 'CANCELED' };
    }
    await writeFile(filePath, content, 'utf8');
    return { ok: true, path: filePath };
  });

  // 拖拽导入的读取通道：路径由 preload 里的 webUtils.getPathForFile 换取后传来。
  // 渲染端传来的任意路径字符串一律当不可信输入：先校验，再读取。
  ipcMain.handle('files:readDropped', async (event, filePath) => {
    if (typeof filePath !== 'string' || !/\.(txt|md)$/i.test(filePath)) {
      return { ok: false, reason: 'UNSUPPORTED_TYPE' };
    }
    try {
      const content = await readFile(filePath, 'utf8');
      return { ok: true, name: filePath.split(/[\\/]/).pop(), content };
    } catch {
      // 文件可能已被移动或删除：读失败也是正常分支
      return { ok: false, reason: 'READ_FAILED' };
    }
  });
}

registerIpcHandlers();
