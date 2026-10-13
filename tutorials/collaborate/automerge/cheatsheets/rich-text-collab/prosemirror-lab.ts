/**
 * 范例介绍：ProseMirror 单编辑器与文档双向同步实验室。
 * 输入：程序写入动作（无 / 尾部追加一句话 / 开头五个字符加粗）。
 * 操作：在画布编辑器里打字、用菜单栏加粗或改标题（编辑器 → 文档）；或从 Controls /
 *       画布按钮触发程序写入（handle.change → 编辑器）。
 * 预期：两个方向都实时生效——编辑器事务经 syncPlugin 的 appendTransaction 落进
 *       Automerge；handle.change 发出的 change 事件经 patchesToTr 反向应用到编辑器。
 *       读数给出当前 spans、文档变更次数与编辑器字符数。
 * 阅读主线：init(handle, ['rich']) 一次拿到 schema / pmDoc / plugin 三件套；
 *       exampleSetup 的插件数组手动拼上 automerge 插件；编辑器只是文档的一个视图。
 */
import * as A from '@automerge/automerge';
import { Repo } from '@automerge/automerge-repo';
import { init } from '@automerge/prosemirror';
import { exampleSetup } from 'prosemirror-example-setup';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export const PM_ACTIONS = ['none', 'append', 'strong-head'] as const;
export type PmAction = (typeof PM_ACTIONS)[number];

export const PM_ACTION_LABELS: Record<PmAction, string> = {
  none: '无',
  append: '尾部追加一句话',
  'strong-head': '开头五个字符加粗',
};

export const PM_ACTION_OPTIONS: string[] = Object.values(PM_ACTION_LABELS);

export function pmActionFromLabel(label: string): PmAction {
  const match = (
    Object.entries(PM_ACTION_LABELS) as Array<[PmAction, string]>
  ).find(([, value]) => value === label);
  return match ? match[0] : 'none';
}

/** Controls 传入的参数：action 是 Controls 里选中的中文标签。 */
export interface PmLabArgsView {
  action: string;
}

export interface PmLabSnapshot {
  spansText: string;
  changeCount: number;
  lastAction: string;
  editorChars: number;
}

export interface PmLabInstance {
  update(args: PmLabArgsView): void;
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

const FIRST_PARAGRAPH = 'Automerge 的富文本由字符与标记组成。';

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
.cs-prosemirror-lab { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 8px; padding: 38px 12px 10px; overflow: auto; }
.cs-prosemirror-lab__toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
.cs-prosemirror-lab__toolbar button { font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; }
.cs-prosemirror-lab__toolbar button:hover { border-color: #64748b; }
.cs-prosemirror-lab .ProseMirror-menubar-wrapper { border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; }
.cs-prosemirror-lab .ProseMirror-menubar { display: flex; flex-wrap: wrap; gap: 2px; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; min-height: 26px; align-items: center; }
.cs-prosemirror-lab .ProseMirror-menuitem { display: inline-block; }
.cs-prosemirror-lab .ProseMirror-menubar button,
.cs-prosemirror-lab .ProseMirror-menubar select { font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; padding: 2px 6px; }
.cs-prosemirror-lab .ProseMirror { min-height: 90px; padding: 8px 12px; outline: none; font: 15px/1.7 ui-sans-serif, system-ui, sans-serif; color: #0f172a; }
.cs-prosemirror-lab .ProseMirror h2 { font-size: 1.25em; margin: 0.4em 0; }
.cs-prosemirror-lab .ProseMirror p { margin: 0.3em 0; }
`;

export function createPmLab(
  host: HTMLElement,
  emit: (snapshot: PmLabSnapshot) => void,
): PmLabInstance {
  const style = document.createElement('style');
  style.textContent = LAB_STYLE;

  const wrapper = document.createElement('div');
  wrapper.className = 'cs-prosemirror-lab';

  const toolbar = document.createElement('div');
  toolbar.className = 'cs-prosemirror-lab__toolbar';

  const mount = document.createElement('div');
  wrapper.append(toolbar, mount);
  host.append(style, wrapper);

  // 仓库与文档在编辑器之外：文档是事实源，编辑器只是它的一个视图
  const repo = new Repo();
  const handle = repo.create<RichTextDoc>({ rich: '' });
  handle.change((d) => {
    A.splice(d, ['rich'], 0, 0, `${FIRST_PARAGRAPH}块标记把段落与标题也放进同一条序列。`);
    A.splitBlock(d, ['rich'], FIRST_PARAGRAPH.length, { type: 'paragraph' });
  });

  // init 一次拿到三件套：默认走 basicSchemaAdapter（strong / em / link + 常用块）
  const { schema, pmDoc, plugin } = init(handle as unknown as PmHandle, ['rich']);
  const state = EditorState.create({
    doc: pmDoc,
    // exampleSetup 没有 plugins 选项：把 automerge 插件手动拼进插件数组
    plugins: [...exampleSetup({ schema, floatingMenu: false }), plugin],
  });

  let disposed = false;
  let changeCount = 0;
  let lastAction = '尚未操作';
  let pendingAction: string | null = null;
  let editorChars = 0;

  const onDocChange = () => {
    changeCount += 1;
    lastAction = pendingAction ?? '编辑器输入';
    pendingAction = null;
    editorChars = view.state.doc.textContent.length;
    emitSnapshot();
  };
  handle.on('change', onDocChange);

  const view = new EditorView(mount, {
    state,
    dispatchTransaction(transaction) {
      if (disposed) {
        return;
      }
      // 维持既有运行时行为：事务对象直接交给视图（EditorState 类型仅为声明形态）
      view.updateState(transaction as unknown as EditorState);
    },
  });

  function emitSnapshot() {
    const doc = handle.doc();
    emit({
      spansText: doc ? JSON.stringify(A.spans(doc, ['rich'])) : '—',
      changeCount,
      lastAction,
      editorChars,
    });
  }

  function programAppend() {
    const doc = handle.doc();
    if (!doc) {
      return;
    }
    pendingAction = '程序追加一句话';
    handle.change((d) => {
      A.splice(d, ['rich'], endIndex(doc), 0, '（来自程序的一次写入）');
    });
  }

  function programStrongHead() {
    pendingAction = '程序加粗开头';
    handle.change((d) => {
      A.mark(d, ['rich'], { start: 0, end: 5, expand: 'both' }, 'strong', true);
    });
  }

  const appendButton = document.createElement('button');
  appendButton.type = 'button';
  appendButton.textContent = '程序追加一句话';
  appendButton.addEventListener('click', programAppend);

  const strongButton = document.createElement('button');
  strongButton.type = 'button';
  strongButton.textContent = '程序加粗开头';
  strongButton.addEventListener('click', programStrongHead);

  toolbar.append(appendButton, strongButton);
  editorChars = view.state.doc.textContent.length;
  emitSnapshot();

  return {
    update(args) {
      const action = pmActionFromLabel(args.action);
      if (action === 'append') {
        programAppend();
      } else if (action === 'strong-head') {
        programStrongHead();
      }
    },
    dispose() {
      disposed = true;
      handle.off('change', onDocChange);
      view.destroy();
      void repo.shutdown();
      style.remove();
      wrapper.remove();
    },
  };
}
