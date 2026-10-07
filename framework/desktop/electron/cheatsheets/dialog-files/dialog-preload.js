/**
 * 文件与对话框的预加载参考实现（src/preload.js）。
 * 演示：对话框与文件能力按「包装而非透传」暴露成具名函数（原则见「预加载脚本」课）；
 *       Electron 32 起 File.path 已移除，拖拽文件的路径要在 preload 里
 *       用 webUtils.getPathForFile 换取，且尽量不让完整路径进入页面主世界。
 * 用法：整个文件替换 src/preload.js；页面经 window.dialogs / window.files 调用。
 * 阅读主线：页面看不到任何通道名与 Node API，只看到能力动词。
 */
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('dialogs', {
  // 页面：const result = await window.dialogs.openTextFile();
  openTextFile: () => ipcRenderer.invoke('dialog:openTextFile'),
  // 页面：const result = await window.dialogs.pickImages();
  pickImages: () => ipcRenderer.invoke('dialog:pickImages'),
  // 页面：const result = await window.dialogs.saveTextFile(text);
  saveTextFile: (content) => ipcRenderer.invoke('dialog:saveTextFile', content),
});

contextBridge.exposeInMainWorld('files', {
  // 拖拽导入一步到位：File 对象进来，路径在 preload 里换取后直接交主进程，
  // 完整路径不经过页面主世界（官方建议：尽量不要把完整文件路径暴露给页面）。
  // 页面：const result = await window.files.readDropped(file);
  readDropped: (file) =>
    ipcRenderer.invoke('files:readDropped', webUtils.getPathForFile(file)),
  // 确实需要把路径交给页面时的最小暴露（webUtils 是渲染进程模块，
  // contextIsolation 下只能在 preload 里调用）：
  // pathOf: (file) => webUtils.getPathForFile(file),
});
