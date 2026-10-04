/**
 * 范例介绍：模拟 chrome.downloads 的状态机与 pause / resume / cancel 控制。
 * 前置状态：一次由本扩展发起的下载（byExtensionName 为本扩展），总大小
 * 48 MiB；「网络结局」参数决定它在四成进度时是否失败以及失败原因。
 * 主要操作：点「download()」发起，下载中分别试 pause / resume / cancel；
 * 切换「网络结局」对比正常完成与两种中断。
 * 预期结果：暂停时 paused 为 true 但 state 仍是 in_progress；取消与失败都
 * 让 state 变 interrupted，error 分别是 USER_CANCELED 与网络 / 磁盘原因；
 * onChanged 只在 state / paused / error 等字段变化时出现，bytesReceived
 * 的持续推进不触发事件（真实环境里字节进度要用 search 轮询）。
 * 阅读主线：上半部分是下载卡片（状态徽标、进度条、字节读数），中间是四个
 * 调用按钮，底部是按发生顺序记录的调用与事件日志。
 */

export type Scenario = 'ok' | 'network' | 'disk';

export interface DownloadLifecycleOptions {
  scenario: Scenario;
}

export interface DownloadLifecycleSnapshot {
  stateLabel: string;
  flagsLabel: string;
  bytesLabel: string;
  changedCount: string;
}

export interface DownloadLifecycleInstance {
  element: HTMLElement;
  update(options: DownloadLifecycleOptions): void;
  snapshot(): Array<[string, string]>;
  dispose(): void;
}

const TOTAL_BYTES = 48 * 1024 * 1024;
const TICK_MS = 250;
const FAIL_AT = 0.4;
const DOWNLOAD_ID = 7;

const ERROR_BY_SCENARIO: Record<Exclude<Scenario, 'ok'>, string> = {
  network: 'NETWORK_FAILED',
  disk: 'FILE_NO_SPACE',
};

const CAN_RESUME_BY_SCENARIO: Record<Exclude<Scenario, 'ok'>, boolean> = {
  network: true,
  disk: false,
};

// 共享样式（assets/story-canvas.css）只提供 .cs-stage 外壳，本课范例的
// .dl-* 样式随范例文件注入，不修改共享基础设施
const STYLE_ID = 'download-lifecycle-style';

const STYLE = `
.cs-stage.dl-stage {
  aspect-ratio: auto;
  min-height: 500px;
  padding: 38px 14px 114px;
  background: #f8fafc;
}
.dl-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dl-action {
  padding: 7px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  font-size: 12px;
  cursor: pointer;
}
.dl-action:hover { border-color: #4f7cff; color: #3b5bdb; }
.dl-action:disabled {
  border-color: #e2e8f0;
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
.dl-card {
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
}
.dl-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}
.dl-state {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.dl-state--in_progress { background: #dbeafe; color: #1d4ed8; }
.dl-state--complete { background: #dcfce7; color: #15803d; }
.dl-state--interrupted { background: #fee2e2; color: #b91c1c; }
.dl-card-file {
  margin-top: 4px;
  color: #64748b;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dl-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 11px;
  color: #475569;
}
.dl-progress-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}
.dl-progress-bar {
  height: 100%;
  background: #4f7cff;
  transition: width 0.2s linear;
}
.dl-progress-bar--interrupted { background: #f87171; }
.dl-progress-bar--complete { background: #22c55e; }
.dl-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.dl-flag {
  padding: 2px 8px;
  border: 1px solid #dbe3f0;
  border-radius: 5px;
  color: #475569;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dl-flag b { color: #172033; }
.dl-log {
  height: 138px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font: 11px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-y: auto;
}
.dl-log-line--call { color: #93c5fd; }
.dl-log-line--result { color: #86efac; }
.dl-log-line--event { color: #fcd34d; }
.dl-log-line--note { color: #cbd5e1; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = el('style', undefined, STYLE);
  style.id = STYLE_ID;
  document.head.append(style);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

export function createDownloadLifecycle(): DownloadLifecycleInstance {
  ensureStyles();
  const root = el('div', 'cs-stage dl-stage');

  const panel = el('div', 'dl-panel');
  const downloadButton = el('button', 'dl-action', 'download()');
  downloadButton.type = 'button';
  const pauseButton = el('button', 'dl-action', 'pause(id)');
  pauseButton.type = 'button';
  const resumeButton = el('button', 'dl-action', 'resume(id)');
  resumeButton.type = 'button';
  const cancelButton = el('button', 'dl-action', 'cancel(id)');
  cancelButton.type = 'button';
  panel.append(downloadButton, pauseButton, resumeButton, cancelButton);

  const card = el('div', 'dl-card');
  const cardHead = el('div', 'dl-card-head');
  const stateBadge = el('span', 'dl-state dl-state--in_progress', 'idle');
  const cardFile = el('div', 'dl-card-file', '—');
  const progress = el('div', 'dl-progress');
  const progressText = el('span', undefined, '0 / 0 MiB');
  const progressTrack = el('div', 'dl-progress-track');
  const progressBar = el('div', 'dl-progress-bar');
  progressTrack.append(progressBar);
  progress.append(progressText, progressTrack);
  const flags = el('div', 'dl-flags');
  cardHead.append(stateBadge, el('span', undefined, 'reports/2026-10.pdf'));
  card.append(cardHead, cardFile, progress, flags);

  const log = el('div', 'dl-log');
  root.append(panel, card, log);

  // —— 模拟后端：状态机与 DownloadItem 字段对齐 chrome.downloads API 参考 ——

  type State = 'idle' | 'in_progress' | 'interrupted' | 'complete';

  interface Download {
    state: State;
    paused: boolean;
    canResume: boolean;
    error?: string;
    bytesReceived: number;
  }

  let download: Download = {
    state: 'idle',
    paused: false,
    canResume: false,
    bytesReceived: 0,
  };
  let options: DownloadLifecycleOptions = { scenario: 'ok' };
  let timer: number | undefined;
  let changedCount = 0;
  let byteProgressLogged = false;

  function logLine(kind: 'call' | 'result' | 'event' | 'note', text: string) {
    log.append(el('div', `dl-log-line dl-log-line--${kind}`, text));
    log.scrollTop = log.scrollHeight;
  }

  // onChanged 的 delta 结构：每个变化字段都是 { current, previous }
  function dispatchChange(changes: string) {
    changedCount += 1;
    logLine('event', `onChanged({ id: ${DOWNLOAD_ID}, ${changes} })`);
  }

  function stopTimer() {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function fail(reason: string, canResume: boolean) {
    const previous = download.state;
    download.state = 'interrupted';
    download.paused = false;
    download.canResume = canResume;
    download.error = reason;
    stopTimer();
    dispatchChange(
      `state: { current: "interrupted", previous: "${previous}" }, error: { current: "${reason}" }`,
    );
    render();
  }

  function start() {
    stopTimer();
    timer = window.setInterval(() => {
      const chunk = TOTAL_BYTES / 28;
      download.bytesReceived = Math.min(
        TOTAL_BYTES,
        download.bytesReceived + chunk + (Math.random() - 0.35) * chunk * 0.3,
      );

      if (!byteProgressLogged && download.bytesReceived > 0) {
        byteProgressLogged = true;
        logLine(
          'note',
          'bytesReceived 持续推进不派发 onChanged——字节进度真实环境用 search 轮询',
        );
      }

      if (download.bytesReceived >= TOTAL_BYTES) {
        download.bytesReceived = TOTAL_BYTES;
        const previous = download.state;
        download.state = 'complete';
        stopTimer();
        dispatchChange(
          `state: { current: "complete", previous: "${previous}" }, endTime: { current: … }`,
        );
      } else if (options.scenario !== 'ok' && download.bytesReceived >= TOTAL_BYTES * FAIL_AT) {
        fail(ERROR_BY_SCENARIO[options.scenario], CAN_RESUME_BY_SCENARIO[options.scenario]);
      }
      render();
    }, TICK_MS);
  }

  function onDownload() {
    download = {
      state: 'in_progress',
      paused: false,
      canResume: false,
      bytesReceived: 0,
    };
    changedCount = 0;
    byteProgressLogged = false;
    logLine(
      'call',
      'chrome.downloads.download({ url: "https://example.com/report.pdf", filename: "reports/2026-10.pdf" })',
    );
    logLine('result', `→ ${DOWNLOAD_ID}`);
    logLine(
      'event',
      `onCreated({ id: ${DOWNLOAD_ID}, state: "in_progress", bytesReceived: 0, totalBytes: ${TOTAL_BYTES}, byExtensionName: "浏览器数据" })`,
    );
    start();
    render();
  }

  function onPause() {
    logLine('call', `chrome.downloads.pause(${DOWNLOAD_ID})`);
    download.paused = true;
    stopTimer();
    dispatchChange('paused: { current: true, previous: false }');
    render();
  }

  function onResume() {
    logLine('call', `chrome.downloads.resume(${DOWNLOAD_ID})`);
    download.paused = false;
    dispatchChange('paused: { current: false, previous: true }');
    start();
    render();
  }

  function onCancel() {
    logLine('call', `chrome.downloads.cancel(${DOWNLOAD_ID})`);
    fail('USER_CANCELED', false);
  }

  function render() {
    const active = download.state === 'in_progress' || download.paused;
    downloadButton.disabled = active;
    pauseButton.disabled = !(download.state === 'in_progress' && !download.paused);
    resumeButton.disabled = !download.paused;
    cancelButton.disabled = !active;

    stateBadge.textContent = download.state;
    stateBadge.className = `dl-state dl-state--${download.state}`;

    cardFile.textContent =
      download.state === 'idle'
        ? '尚未发起下载'
        : `filename: /Users/…/Downloads/reports/2026-10.pdf · totalBytes ${formatBytes(TOTAL_BYTES)} · byExtensionName 浏览器数据`;

    const percent = Math.round((download.bytesReceived / TOTAL_BYTES) * 100);
    progressText.textContent = `${formatBytes(download.bytesReceived)} / ${formatBytes(TOTAL_BYTES)}（${percent}%）`;
    progressBar.style.width = `${percent}%`;
    progressBar.className =
      download.state === 'interrupted'
        ? 'dl-progress-bar dl-progress-bar--interrupted'
        : download.state === 'complete'
          ? 'dl-progress-bar dl-progress-bar--complete'
          : 'dl-progress-bar';

    flags.replaceChildren();
    const flag = (label: string, value: string) => {
      const chip = el('span', 'dl-flag');
      chip.append(el('span', undefined, `${label}: `), el('b', undefined, value));
      flags.append(chip);
    };
    flag('state', download.state);
    flag('paused', String(download.paused));
    flag('canResume', String(download.canResume));
    flag('error', download.error ?? 'undefined');
    flag('danger', '"safe"');
  }

  downloadButton.addEventListener('click', onDownload);
  pauseButton.addEventListener('click', onPause);
  resumeButton.addEventListener('click', onResume);
  cancelButton.addEventListener('click', onCancel);

  logLine(
    'note',
    '提示：pause / resume / cancel 只在下载进行中可用；取消与失败都进入 interrupted，由 error 说明原因',
  );

  render();

  return {
    element: root,
    update(next: DownloadLifecycleOptions) {
      const changed = next.scenario !== options.scenario;
      options = next;
      if (changed && download.state === 'idle') {
        logLine(
          'note',
          `网络结局已切换：${options.scenario === 'ok' ? '正常完成' : `四成进度时中断（${ERROR_BY_SCENARIO[options.scenario]}）`}`,
        );
      }
      render();
    },
    snapshot(): Array<[string, string]> {
      return [
        ['state', download.state],
        [
          'paused / canResume',
          `${download.paused} / ${download.canResume}`,
        ],
        ['error', download.error ?? 'undefined'],
        [
          '已接收',
          `${formatBytes(download.bytesReceived)} / ${formatBytes(TOTAL_BYTES)}`,
        ],
        ['onChanged 次数', String(changedCount)],
      ];
    },
    dispose() {
      stopTimer();
    },
  };
}
