/**
 * 范例介绍：渲染端录屏链路——把主进程递来的 source.id 变成 MediaRecorder 的 webm。
 *
 * 前置状态：preload 已暴露 window.desktopCapture（见 capture-preload.ts）；
 * macOS 需先通过「屏幕录制」授权（检查在主进程，见 capture-main.ts）。
 * 主要操作：startRecording(sourceId) 建流并起录制器，返回的 stop() 收尾并合并分片。
 * 预期结果：一段 video/webm 的 Blob，可交 <a download> 下载或经桥回主进程写盘。
 * 阅读主线：mandatory 约束是 Chromium 的 desktop 源写法，chromeMediaSourceId
 * 必须是 getSources 返回的完整 id；音频有平台门槛，本范例先只录画面。
 */

interface SourceSummary {
  id: string;
  name: string;
  thumbnailDataURL: string;
}

interface DesktopCaptureBridge {
  listSources(
    types: Array<'screen' | 'window'>,
    thumbnailSize?: { width: number; height: number },
  ): Promise<SourceSummary[]>;
}

declare global {
  interface Window {
    desktopCapture: DesktopCaptureBridge;
  }
}

export interface RecordingSession {
  stream: MediaStream;
  stop: () => Promise<Blob>;
}

/**
 * 把 id 接进 Chromium 的 desktop 源约束：屏幕与窗口走同一套约束，
 * 传窗口的 id 录到的就只有那扇窗的画面。
 */
export async function startRecording(sourceId: string): Promise<RecordingSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false, // 系统音频有平台门槛（macOS 静默失败 / loopback 仅 Windows），先录画面
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
      },
    },
  });

  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

  // 分片增量收集：只在 stop 时才拿数据的话，崩溃 / 强退会丢整段
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });
  recorder.start(1000); // 每秒一个分片

  return {
    stream,
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.addEventListener('stop', () => {
          // 停止后释放捕获资源：屏幕共享指示由 track 生命周期决定
          stream.getTracks().forEach((track) => track.stop());
          resolve(new Blob(chunks, { type: 'video/webm' }));
        });
        recorder.stop();
      }),
  };
}

/** 示例：直接录主屏——真实应用应先让用户从 listSources 的清单里挑 */
export async function recordPrimaryScreen(): Promise<RecordingSession> {
  const sources = await window.desktopCapture.listSources(['screen'], {
    width: 150,
    height: 150, // 清单预览用默认尺寸就够；录制画面尺寸由约束与屏幕 / 窗口决定
  });
  const screen = sources[0];
  if (!screen) {
    throw new Error('没有可捕获的屏幕：检查 types 与 macOS 授权');
  }
  return startRecording(screen.id);
}
