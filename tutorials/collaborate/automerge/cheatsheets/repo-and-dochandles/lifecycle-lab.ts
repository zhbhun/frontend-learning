/**
 * 范例介绍：DocHandle 的生命周期与按 URL 查找的三种结局。
 * 输入：一个动作（create / change / find 自身 URL / find 未知的合法 URL /
 *       find 非法字符串 / delete）与写入的标题文本。仓库只接内存：
 *       new Repo({ peerId })，无存储、无网络。
 * 预期：create 同步拿到就绪 handle；find 自身 URL 拿回同一实例；find 未知但合法的
 *       URL 立即以 Document … is unavailable 拒绝；find 非法字符串以
 *       Invalid AutomergeUrl 拒绝；delete 后 handle 进入 deleted 状态。
 * 阅读主线：runAction 的各分支；快照里的 state / isReady / url / 最近一次操作结果。
 */
import {
  generateAutomergeUrl,
  Repo,
  type AutomergeUrl,
  type DocHandle,
  type PeerId,
} from '@automerge/automerge-repo';

import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LifecycleAction =
  | 'create'
  | 'change'
  | 'find-own'
  | 'find-unknown'
  | 'find-invalid'
  | 'delete';

export const LIFECYCLE_ACTION_LABELS: Record<LifecycleAction, string> = {
  create: 'create 新建文档',
  change: 'change 修改文档',
  'find-own': 'find 自身的 URL',
  'find-unknown': 'find 未知的合法 URL',
  'find-invalid': 'find 非法字符串',
  delete: 'delete 删除文档',
};

/** Controls 面板里操作选择器的候选标签（中文）。 */
export const LIFECYCLE_ACTION_OPTIONS: string[] = Object.values(
  LIFECYCLE_ACTION_LABELS,
);

export function actionFromLabel(label: string): LifecycleAction {
  const entry = Object.entries(LIFECYCLE_ACTION_LABELS).find(
    ([, value]) => value === label,
  );
  return (entry?.[0] as LifecycleAction | undefined) ?? 'create';
}

/** URL 展示用短码：保留协议头与前几位，避免画布溢出。 */
export function shortenUrl(url: string, keep = 14): string {
  const prefix = 'automerge:';
  const body = url.startsWith(prefix) ? url.slice(prefix.length) : url;
  return body.length > keep ? `${prefix}${body.slice(0, keep)}…` : url;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** stories 传入的参数：action 是 Controls 里选中的中文标签。 */
export interface LifecycleArgsView {
  action: string;
  title: string;
}

export interface LifecycleSnapshot {
  action: LifecycleAction;
  peerId: string;
  state: string;
  isReady: boolean;
  isDeleted: boolean;
  url: string | null;
  docTitle: string | null;
  itemCount: number | null;
  lastResult: string;
  log: string[];
}

export interface LifecycleInstance {
  update(options: LifecycleArgsView): void;
  dispose(): void;
}

type NoteDoc = { title: string; items: string[] };

interface DocRead {
  title: string | null;
  itemCount: number | null;
}

/** 已删除的 handle 按不可读处理：删除即作废，是本课固定的使用纪律。 */
function readDoc(handle: DocHandle<NoteDoc> | null): DocRead {
  if (!handle || handle.isDeleted()) {
    return { title: null, itemCount: null };
  }
  const doc = handle.doc();
  if (!doc) {
    return { title: null, itemCount: null };
  }
  return { title: doc.title, itemCount: doc.items.length };
}

interface DrawLine {
  text: string;
  color: string;
  bold?: boolean;
}

export function createLifecycleDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  // 无存储、无网络的内存仓库：create / find 的所有语义都在本页内立见分晓。
  const repo = new Repo({ peerId: 'device-a' as PeerId });
  let handle: DocHandle<NoteDoc> | null = null;
  let log: string[] = [];
  let lastResult = '选择一个动作开始';
  let currentAction: LifecycleAction = 'create';

  function snapshot(): LifecycleSnapshot {
    const { title, itemCount } = readDoc(handle);
    return {
      action: currentAction,
      peerId: repo.peerId,
      state: handle ? handle.state : '—',
      isReady: handle ? handle.isReady() : false,
      isDeleted: handle ? handle.isDeleted() : false,
      url: handle ? handle.url : null,
      docTitle: title,
      itemCount,
      lastResult,
      log: [...log],
    };
  }

  function pushLog(line: string): void {
    log = [...log.slice(-3), line];
  }

  function draw(): void {
    const snap = snapshot();
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const lines: DrawLine[] = [
      {
        text: `动作：${LIFECYCLE_ACTION_LABELS[snap.action]}`,
        color: '#172033',
        bold: true,
      },
      {
        text: `repo.peerId = "${snap.peerId}"（无存储、无网络的内存仓库）`,
        color: '#334155',
      },
      {
        text: handle
          ? `handle.state = "${snap.state}"   isReady=${snap.isReady}   isDeleted=${snap.isDeleted}`
          : 'handle =（尚未创建）',
        color: snap.isDeleted ? '#b45309' : '#334155',
        bold: snap.isDeleted,
      },
      {
        text: handle ? `handle.url = ${shortenUrl(snap.url ?? '')}` : 'handle.url = —',
        color: '#334155',
      },
      {
        text:
          snap.docTitle === null
            ? 'doc() =（不可读：尚未创建或已删除）'
            : `doc() = { title: "${snap.docTitle}", items.length: ${snap.itemCount} }`,
        color: '#334155',
      },
    ];
    for (const entry of snap.log) {
      lines.push({ text: entry, color: '#64748b' });
    }
    lines.push({ text: `观察：${snap.lastResult}`, color: '#166534', bold: true });

    let y = 40;
    for (const line of lines) {
      drawingContext.fillStyle = line.color;
      drawingContext.font = `${line.bold ? '600 ' : ''}14px ui-monospace, SFMono-Regular, Menlo, monospace`;
      drawingContext.fillText(truncate(line.text, 66), 24, y);
      y += 28;
    }

    emit(snap);
  }

  async function runAction(action: LifecycleAction, title: string): Promise<void> {
    currentAction = action;
    switch (action) {
      case 'create': {
        handle = repo.create<NoteDoc>({ title, items: [] });
        pushLog('repo.create({ title, items: [] })');
        lastResult = `同步返回：state="${handle.state}"、isReady()=${handle.isReady()}，URL 每次都是全新的`;
        break;
      }
      case 'change': {
        if (!handle) {
          lastResult = '还没有 handle：先执行 create';
          break;
        }
        if (handle.isDeleted()) {
          lastResult = 'handle 已删除：删除即作废，先 create 新文档';
          break;
        }
        handle.change((d) => {
          d.title = title;
          d.items.push(`第 ${d.items.length + 1} 次写入`);
        });
        pushLog('handle.change((d) => { ... })');
        lastResult = '同步完成；接了存储/网络时，落盘与广播由 Repo 自动接手';
        break;
      }
      case 'find-own': {
        if (!handle) {
          lastResult = '还没有 URL 可查：先执行 create';
          break;
        }
        const url = handle.url;
        const wasDeleted = handle.isDeleted();
        pushLog('repo.find(handle.url)');
        try {
          const found = await repo.find<NoteDoc>(url);
          lastResult =
            found === handle
              ? '拿回同一个 handle 实例：同一仓库内同一 URL 只有一个 handle'
              : '拿回了不同的 handle 实例（不应发生）';
        } catch (cause) {
          lastResult = `拒绝：${message(cause)}${wasDeleted ? '（文档已删除，本仓库不再提供）' : ''}`;
        }
        break;
      }
      case 'find-unknown': {
        const url = generateAutomergeUrl();
        pushLog(`repo.find(${shortenUrl(url)}) // 合法，但谁都没有`);
        try {
          await repo.find<NoteDoc>(url);
          lastResult = '意外成功（不应发生）';
        } catch (cause) {
          lastResult = `立即拒绝：${message(cause)}——没有存储、没有同伴，无人能提供`;
        }
        break;
      }
      case 'find-invalid': {
        pushLog('repo.find("not-an-automerge-url")');
        try {
          await repo.find<NoteDoc>('not-an-automerge-url' as AutomergeUrl);
          lastResult = '意外成功（不应发生）';
        } catch (cause) {
          lastResult = `立即拒绝：${message(cause)}——URL 没通过 base58check 校验`;
        }
        break;
      }
      case 'delete': {
        if (!handle) {
          lastResult = '还没有可删除的文档：先执行 create';
          break;
        }
        if (handle.isDeleted()) {
          lastResult = '已经删除过了：同一文档删除一次就够';
          break;
        }
        repo.delete(handle.url);
        pushLog('repo.delete(handle.url)');
        lastResult = `state 变为 "${handle.state}"；此后再 find 该 URL 会被拒绝`;
        break;
      }
    }
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, () => {
    draw();
  });

  return {
    update(options) {
      void runAction(actionFromLabel(options.action), options.title);
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
