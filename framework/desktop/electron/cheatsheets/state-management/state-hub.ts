/**
 * 主进程单一事实源参考实现（TS + Vite 工程的主进程侧，框架无关）。
 * 输入：渲染端经 window.api 发起的读（state:get）与写（state:set-nickname）。
 * 操作：写请求在主进程落地 → 广播变更后的状态给全部存活窗口；晚开、刷新的窗口
 * 由 did-finish-load 补推快照（接线见正文快速上手）。
 * 预期结果：任一窗口修改后，所有窗口看到同一个值；重启即失（持久化见正文）。
 * 阅读主线：唯一状态 → handle 读 / 写 → broadcast → 迟到窗口补推。
 * AppState 定义在工程的 src/api.ts 类型真源（正文快速上手第 3 步）。
 */
import { BrowserWindow, ipcMain } from 'electron';

import type { AppState } from './api';

// 唯一状态：只在本模块内可写。invoke 的返回值经结构化克隆，渲染端拿到的天然是副本
let state: AppState = { nickname: '未命名' };

// 广播：遍历存活窗口逐个 send；getAllWindows 是框架维护的存活清单（2.3），
// 天然不含已销毁窗口，新窗口开、旧窗口关都不用额外处理
function broadcastState(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('state:changed', state);
  }
}

// 快照补推：晚开、刷新、崩溃恢复的窗口在页面加载完成后收到当前值（3.3 做法一）
export function pushStateSnapshot(win: BrowserWindow): void {
  win.webContents.send('state:changed', state);
}

export function initStateHub(): void {
  // 读：返回快照。渲染端进入时拉一次（初始快照用拉的）
  ipcMain.handle('state:get', (): AppState => state);

  // 写：唯一写者。主进程单线程，多个窗口的写请求在这里天然串行，无双写冲突；
  // 广播的是变更后的值，不是「把昵称改成 X」的指令
  ipcMain.handle('state:set-nickname', (_event, nickname: string): AppState => {
    state = { ...state, nickname };
    broadcastState();
    return state;
  });
}
