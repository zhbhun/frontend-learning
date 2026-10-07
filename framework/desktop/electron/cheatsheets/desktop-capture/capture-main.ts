/**
 * 范例介绍：主进程侧的屏幕捕获参考实现（TypeScript + Vite 工程的 src/main.ts 增量）。
 *
 * 前置状态：macOS 10.15+ 需要系统的「屏幕录制」授权（TCC）——不能编程申请，只能
 * 检查后引导用户；Windows / Linux 无此门槛（screen 恒 granted）。
 * 主要操作：注册两个 IPC handler——list-sources 把 source 清单递给渲染端；
 * save-screenshot 按目标尺寸重取 source 并把 thumbnail 写成 PNG。
 * 预期结果：渲染端经桥（见 capture-preload.ts）拿到 id / 缩略图预览，选一条后
 * 桌面上出现 capture.png。
 * 阅读主线：先看授权检查，再看两个 handler 与默认值；录屏不走主进程——
 * getUserMedia / MediaRecorder 是渲染端的 Web API，只需要桥递过去的 source.id。
 */
import { app, desktopCapturer, ipcMain, systemPreferences } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export type CaptureType = 'screen' | 'window';

export interface SourceSummary {
  id: string;
  name: string;
  thumbnailDataURL: string;
}

/** macOS 10.15+ 先查授权再干活：'screen' 不在 askForMediaAccess 的支持范围内，无法编程申请 */
export function hasScreenAccess(): boolean {
  if (process.platform !== 'darwin') {
    return true; // Windows / Linux：文档明示 screen 恒 granted
  }
  return systemPreferences.getMediaAccessStatus('screen') === 'granted';
}

// 在 app.whenReady().then(...) 里调用一次（createWindow 之前挂好，渲染端加载后即可用）
export function registerCaptureHandlers(): void {
  // 惯例：desktopCapturer 只在主进程可用，渲染端经 IPC 桥拿清单（桥写法见 capture-preload.ts）
  ipcMain.handle(
    'desktop-capture:list-sources',
    async (_event, types: CaptureType[], thumbnailSize?: { width: number; height: number }) => {
      if (!hasScreenAccess()) {
        throw new Error('缺少「屏幕录制」授权：系统设置 → 隐私与安全性 → 屏幕录制');
      }
      const sources = await desktopCapturer.getSources({
        types, // 必填：'screen' / 'window'
        thumbnailSize: thumbnailSize ?? { width: 150, height: 150 }, // 文档默认值；预览够用
      });
      // 缩略图在主进程转 dataURL：桥上只过纯数据，不把 NativeImage 与完整 source 递进渲染端
      const summaries: SourceSummary[] = sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnailDataURL: source.thumbnail.toDataURL(),
      }));
      return summaries;
    },
  );

  // 静帧落盘：小尺寸列清单、大尺寸取成图——thumbnailSize 是缩放目标，要多大给多大
  ipcMain.handle(
    'desktop-capture:save-screenshot',
    async (_event, sourceId: string, thumbnailSize: { width: number; height: number }) => {
      if (!hasScreenAccess()) {
        throw new Error('缺少「屏幕录制」授权：系统设置 → 隐私与安全性 → 屏幕录制');
      }
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize,
      });
      const source = sources.find((item) => item.id === sourceId);
      // macOS 未授权的典型失败形态：thumbnail 是空图——写盘前用 isEmpty() 拦下
      if (!source || source.thumbnail.isEmpty()) {
        throw new Error(`拿不到 source 或缩略图为空：${sourceId}`);
      }
      const target = path.join(app.getPath('desktop'), 'capture.png');
      await writeFile(target, source.thumbnail.toPNG());
      return target;
    },
  );
}
