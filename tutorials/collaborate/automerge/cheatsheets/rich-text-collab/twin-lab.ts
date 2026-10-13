/**
 * 范例介绍：双副本实时协同实验室——两个 Repo、两台编辑器、同一份富文本。
 * 输入：协同动作（无 / 左侧加粗首句 / 右侧追加一句 / 双侧同时）。
 * 操作：两个 Repo 各带一个随机命名的 BroadcastChannel 网络适配器互为对端；左侧 create
 *       文档，右侧用同一 documentId find；每侧各挂一台 ProseMirror 编辑器，也可以直接
 *       在两侧编辑器里打字。
 * 预期：任意一侧的编辑（字符或格式）经同步出现在对侧；两侧 spans 读数最终一致
 *       （A.spans 相等）。同步未到达前右侧显示「等待对端」。
 * 阅读主线：本地编辑 → 本地 handle.change → change 事件 → 对端 syncPlugin 反向应用；
 *       收敛语义就是正文前两节的 expand 与字符锚定。
 */
import * as A from '@automerge/automerge';
import { Repo } from '@automerge/automerge-repo';
import type { DocHandle } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { init } from '@automerge/prosemirror';
import { exampleSetup } from 'prosemirror-example-setup';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export const TWIN_ACTIONS = ['none', 'left-strong', 'right-append', 'both'] as const;
export type TwinAction = (typeof TWIN_ACTIONS)[number];

export const TWIN_ACTION_LABELS: Record<TwinAction, string> = {
  none: '无',
  'left-strong': '左侧：加粗首句',
  'right-append': '右侧：尾部追加一句',
  both: '双侧：同时写入',
};

export const TWIN_ACTION_OPTIONS: string[] = Object.values(TWIN_ACTION_LABELS);

export function twinActionFromLabel(label: string): TwinAction {
  const match = (
    Object.entries(TWIN_ACTION_LABELS) as Array<[TwinAction, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'none';
}

/** Controls 传入的参数：action 是 Controls 里选中的中文标签。 */
export interface TwinLabArgsView {
  action: string;
}

export interface TwinLabSnapshot {
  leftSpans: string;
  rightSpans: string;
  synced: boolean | null;
  rightStatus: string;
  lastAction: string;
}

export interface TwinLabInstance {
  update(args: TwinLabArgsView): void;
  dispose(): void;
}

// 用 type 而不是 interface：A.from 的泛型约束是 Record<string, unknown>。
type RichTextDoc = {
  rich: string;
};

/**
 * @automerge/prosemirror 的 init 把 handle 声明为 DocHandle<unknown>；其类型声明里
 * change 回调的 payload.doc 是 Doc<unknown>，与泛型 DocHandle<RichTextDoc> 的
 * payload.doc（Doc<RichTextDoc> | undefined）双向都不兼容，实际结构一致，断言桥接。
 */
type PmHandle = Parameters<typeof init>[0];

const LEFT_SENTENCE = '双副本看到的是同一份富文本。';
const SEED = `${LEFT_SENTENCE}任何一侧的文字与格式都会同步到对侧。`;

/** spans 折算成 automerge 的字符索引：文本按长度、块标记占一个索引。 */
function endIndex(doc: A.Doc<RichTextDoc>): number {
  return A.spans(doc, ['rich']).reduce((total, span) => {
    if (span.type === 'text') {
      return total + span.value.length;
    }
    return total + 1;
  }, 0);
}

const LAB_STYLE = `
.cs-twin-lab { position: absolute; inset: 0; display: flex; gap: 10px; padding: 38px 12px 10px; overflow: auto; }
.cs-twin-lab__column { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.cs-twin-lab .ProseMirror-menubar-wrapper { border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
.cs-twin-lab .ProseMirror-menubar { display: flex; flex-wrap: wrap; gap: 2px; padding: 3px 6px; border-bottom: 1px solid #e2e8f0; min-height: 22px; align-items: center; }
.cs-twin-lab .ProseMirror-menuitem { display: inline-block; }
.cs-twin-lab .ProseMirror-menubar button,
.cs-twin-lab .ProseMirror-menubar select { font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; padding: 1px 5px; }
.cs-twin-lab .ProseMirror { min-height: 90px; padding: 6px 10px; outline: none; font: 14px/1.7 ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
.cs-twin-lab .ProseMirror p { margin: 0.25em 0; }
.cs-twin-lab__waiting { font: 13px/1.6 ui-monospace, Menlo, monospace; color: #64748b; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px; }
`;

function uniqueChannelName(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `rich-text-twin-${random}`;
}

export function createTwinLab(
  host: HTMLElement,
  emit: (snapshot: TwinLabSnapshot) => void,
): TwinLabInstance {
  const style = document.createElement('style');
  style.textContent = LAB_STYLE;

  const wrapper = document.createElement('div');
  wrapper.className = 'cs-twin-lab';

  const leftColumn = document.createElement('div');
  leftColumn.className = 'cs-twin-lab__column';
  const leftMount = document.createElement('div');
  leftColumn.append(leftMount);

  const rightColumn = document.createElement('div');
  rightColumn.className = 'cs-twin-lab__column';
  const rightMount = document.createElement('div');
  const rightWaiting = document.createElement('div');
  rightWaiting.className = 'cs-twin-lab__waiting';
  rightWaiting.textContent = '右侧等待对端……（网络适配器握手 + 首次同步）';
  rightColumn.append(rightWaiting, rightMount);

  wrapper.append(leftColumn, rightColumn);
  host.append(style, wrapper);

  // 随机频道名：同一页面上的多份实例互不串线；peerId 让 Repo 自动生成即可
  const channelName = uniqueChannelName();
  const makeNetwork = () => [
    new BroadcastChannelNetworkAdapter({ channelName }),
  ];
  const repoL = new Repo({ network: makeNetwork() });
  const repoR = new Repo({ network: makeNetwork() });

  const handleL = repoL.create<RichTextDoc>({ rich: '' });
  handleL.change((d) => {
    A.splice(d, ['rich'], 0, 0, SEED);
    A.splitBlock(d, ['rich'], LEFT_SENTENCE.length, { type: 'paragraph' });
  });

  let disposed = false;
  let rightEditorReady = false;
  let handleR: DocHandle<RichTextDoc> | undefined;
  let viewL: EditorView | undefined;
  let viewR: EditorView | undefined;
  let lastAction = '尚未操作';

  function spansText(handle: { doc(): A.Doc<RichTextDoc> | undefined }): string {
    const doc = handle.doc();
    return doc ? JSON.stringify(A.spans(doc, ['rich'])) : '—';
  }

  function emitSnapshot(rightStatus: string) {
    const left = spansText(handleL);
    const right = handleR ? spansText(handleR) : '—';
    emit({
      leftSpans: left,
      rightSpans: right,
      synced: handleR ? left === right : null,
      rightStatus,
      lastAction,
    });
  }

  const onLeftChange = () => {
    lastAction = lastAction === '尚未操作' ? '副本 L 写入' : lastAction;
    emitSnapshot(rightEditorReady ? '已接入' : '同步在途');
  };
  const onRightChange = () => {
    lastAction = lastAction === '尚未操作' ? '副本 R 写入' : lastAction;
    emitSnapshot('已接入');
  };
  handleL.on('change', onLeftChange);

  // init(handle, ['rich'])：两侧用同一套默认 schema，互操作才有意义
  const { schema: schemaL, pmDoc: pmDocL, plugin: pluginL } = init(handleL as unknown as PmHandle, ['rich']);
  viewL = new EditorView(leftMount, {
    state: EditorState.create({
      doc: pmDocL,
      plugins: [...exampleSetup({ schema: schemaL, floatingMenu: false }), pluginL],
    }),
    dispatchTransaction(transaction) {
      if (viewL) {
        // 维持既有运行时行为：事务对象直接交给视图（EditorState 类型仅为声明形态）
        viewL.updateState(transaction as unknown as EditorState);
      }
    },
  });

  let rightError: string | null = null;
  const findPromise = repoR
    .find<RichTextDoc>(handleL.documentId)
    .then((found) => {
      if (disposed) {
        return;
      }
      handleR = found;
      rightEditorReady = true;
      handleR.on('change', onRightChange);
      const { schema, pmDoc, plugin } = init(handleR as unknown as PmHandle, ['rich']);
      viewR = new EditorView(rightMount, {
        state: EditorState.create({
          doc: pmDoc,
          plugins: [...exampleSetup({ schema, floatingMenu: false }), plugin],
        }),
        dispatchTransaction(transaction) {
          if (viewR) {
            // 维持既有运行时行为：事务对象直接交给视图（EditorState 类型仅为声明形态）
            viewR.updateState(transaction as unknown as EditorState);
          }
        },
      });
      rightWaiting.remove();
      lastAction = '副本 R 已接入';
      emitSnapshot('已接入');
    })
    .catch((error: unknown) => {
      if (disposed) {
        return;
      }
      rightError = error instanceof Error ? error.message : String(error);
      rightWaiting.textContent = `同步失败：${rightError}`;
      emitSnapshot(`失败：${rightError}`);
    });

  function leftStrong() {
    lastAction = '左侧：加粗首句';
    handleL.change((d) => {
      A.mark(d, ['rich'], { start: 0, end: LEFT_SENTENCE.length, expand: 'both' }, 'strong', true);
    });
  }

  function rightAppend() {
    const doc = handleR?.doc();
    if (!doc || !handleR) {
      lastAction = '右侧尚未就绪';
      emitSnapshot('等待对端……');
      return;
    }
    lastAction = '右侧：尾部追加一句';
    handleR.change((d) => {
      A.splice(d, ['rich'], endIndex(doc), 0, '（右侧写入）');
    });
  }

  return {
    update(args) {
      const action = twinActionFromLabel(args.action);
      if (action === 'left-strong') {
        leftStrong();
      } else if (action === 'right-append') {
        rightAppend();
      } else if (action === 'both') {
        leftStrong();
        rightAppend();
      }
    },
    dispose() {
      disposed = true;
      handleL.off('change', onLeftChange);
      handleR?.off('change', onRightChange);
      viewL?.destroy();
      viewR?.destroy();
      void repoL.shutdown();
      void repoR.shutdown();
      void findPromise;
      style.remove();
      wrapper.remove();
    },
  };
}
