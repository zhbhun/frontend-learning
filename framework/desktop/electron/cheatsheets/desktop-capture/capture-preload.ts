/**
 * 范例介绍：把主进程的捕获能力经 contextBridge 暴露成渲染端可调用的窄接口。
 *
 * 前置状态：主进程已注册 'desktop-capture:*' 两个 handler（见 capture-main.ts）。
 * 主要操作：listSources 拿 source 清单、saveScreenshot 保存静帧——只有两个方法。
 * 预期结果：渲染端 window.desktopCapture 可用；录屏不需要桥——getUserMedia /
 * MediaRecorder 是渲染端自己的 Web API，只需要 listSources 递来的 source.id。
 * 阅读主线：暴露面按「动作」命名并保持最小，清单里的窗口标题与画面属敏感内容。
 */
import { contextBridge, ipcRenderer } from 'electron';

export type CaptureType = 'screen' | 'window';

export interface SourceSummary {
  id: string;
  name: string;
  thumbnailDataURL: string;
}

const api = {
  listSources: (
    types: CaptureType[],
    thumbnailSize?: { width: number; height: number },
  ): Promise<SourceSummary[]> =>
    ipcRenderer.invoke('desktop-capture:list-sources', types, thumbnailSize),

  saveScreenshot: (sourceId: string, thumbnailSize: { width: number; height: number }): Promise<string> =>
    ipcRenderer.invoke('desktop-capture:save-screenshot', sourceId, thumbnailSize),
};

contextBridge.exposeInMainWorld('desktopCapture', api);
