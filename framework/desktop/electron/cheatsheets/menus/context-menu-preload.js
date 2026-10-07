/**
 * 上下文菜单参考实现（预加载脚本）：把「打开菜单」包装成页面的具名动词。
 * 通道名与 ipcRenderer 不出 preload（原则见「预加载脚本」）。
 *
 * 配套：主进程侧见同目录 context-menu-main.js 的「路径一」。
 *
 * 页面用法（放进 src/index.html 的 script）：
 *   window.addEventListener('contextmenu', (event) => {
 *     event.preventDefault();
 *     window.contextMenu.open({ x: event.clientX, y: event.clientY });
 *   });
 *
 * 预期结果：右键页面任意位置，主进程弹出一个编辑角色菜单；
 * popup 不传 x/y 时默认弹在当前光标位置，payload 里的坐标
 * 留给"弹出位置需要显式指定"的场景。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('contextMenu', {
  open: (payload) => ipcRenderer.send('context-menu:open', payload),
});
