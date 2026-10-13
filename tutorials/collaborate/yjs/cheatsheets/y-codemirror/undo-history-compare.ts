/**
 * 范例:同一个「A 输入、B 输入、A 撤销」序列,分别用两套撤销引擎执行的结果对照。
 * 输入:撤销引擎——'yjs'(yCollab 的 Yjs UndoManager,推荐)或
 *      'cm-history'(basicSetup 自带的 CM history,误用)。
 * 操作:两个 Y.Doc 经手写中继互相同步(扮演 Provider);A 输入「甲」,650ms 后
 *      B 在末尾输入「乙」(间隔拉开,让 CM 历史各自成组),再由 A 执行一次撤销——
 *      yjs 引擎调 undoManager.undo()(快捷键命令内部就是它),
 *      cm-history 引擎调 @codemirror/commands 的 undo()(historyKeymap 绑定的命令)。
 * 预期:yjs 引擎只回滚 A 自己的「甲」,两端剩「乙」,撤销作为普通事务同步给 B,
 *      A 的撤销栈清空;cm-history 引擎撤掉的是栈顶——B 刚输入的「乙」,
 *      逆操作作为 A 的新编辑同步出去,把 B 端的「乙」也删掉,而 A 的 Yjs 撤销栈
 *      反而记了两笔——两套历史互不知情。
 * 阅读主线:buildScenario(按引擎组装扩展、建双端与中继)→ 输入序列 → undo →
 *      读数(撤销后文本、被删的字、Yjs 栈深度)。
 */
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { history, historyKeymap, undo as cmUndo } from '@codemirror/commands';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';

export type UndoCompareEngine = 'yjs' | 'cm-history';

export interface UndoCompareOptions {
  engine: UndoCompareEngine;
}

export interface UndoCompareSnapshot {
  engineLabel: string;
  status: string;
  textAfterA: string;
  textAfterB: string;
  removedByUndo: string;
  yjsStackDepth: string;
}

export interface UndoCompareInstance {
  update(options: UndoCompareOptions): void;
  dispose(): void;
}

const ENGINE_LABELS: Record<UndoCompareEngine, string> = {
  yjs: 'yCollab(Yjs UndoManager)',
  'cm-history': 'CM history(basicSetup 误用)',
};

interface Client {
  doc: Y.Doc;
  ytext: Y.Text;
  awareness: Awareness;
  undoManager: Y.UndoManager;
}

interface Built {
  a: Client;
  b: Client;
  viewA: EditorView;
  viewB: EditorView;
  destroy(): void;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(): Client {
  const doc = new Y.Doc();
  const ytext = doc.getText('codemirror');
  const awareness = new Awareness(doc);
  awareness.setLocalStateField('user', {
    name: '用户A',
    color: '#4f7cff',
    colorLight: '#4f7cff33',
  });
  return {
    doc,
    ytext,
    awareness,
    undoManager: new Y.UndoManager(ytext),
  };
}

function buildScenario(
  engine: UndoCompareEngine,
  mountA: HTMLElement,
  mountB: HTMLElement,
): Built {
  const a = createClient();
  const b = createClient();

  /**
   * 两种组装只差撤销件:yjs 是推荐做法(yUndoManagerKeymap 放最前,先声明者优先);
   * cm-history 等价于「basicSetup 自带 history + historyKeymap,又没盖住 Mod-z」的误用。
   * 内容同步件相同:没有 history 时远端更新只进编辑器,不进任何撤销栈。
   */
  const undoExtensions: Extension[] =
    engine === 'yjs'
      ? [keymap.of(yUndoManagerKeymap)]
      : [history(), keymap.of(historyKeymap)];

  const createView = (client: Client, parent: HTMLElement) =>
    new EditorView({
      state: EditorState.create({
        doc: client.ytext.toString(),
        extensions: [
          ...undoExtensions,
          EditorView.lineWrapping,
          yCollab(client.ytext, client.awareness, { undoManager: client.undoManager }),
        ],
      }),
      parent,
    });
  const viewA = createView(a, mountA);
  const viewB = createView(b, mountB);

  // 手写中继:文档更新互发(带 'remote' origin,模拟 Provider);本例不渲染光标,
  // awareness 消息转发省略。
  const onDocA = (update: Uint8Array) => Y.applyUpdate(b.doc, update, 'remote');
  const onDocB = (update: Uint8Array) => Y.applyUpdate(a.doc, update, 'remote');
  a.doc.on('update', onDocA);
  b.doc.on('update', onDocB);

  return {
    a,
    b,
    viewA,
    viewB,
    destroy() {
      a.doc.off('update', onDocA);
      b.doc.off('update', onDocB);
      viewA.destroy();
      viewB.destroy();
      a.awareness.destroy();
      b.awareness.destroy();
      a.doc.destroy();
      b.doc.destroy();
    },
  };
}

export function createUndoCompare(
  mount: HTMLElement,
  emit: (snapshot: UndoCompareSnapshot) => void,
): UndoCompareInstance {
  const panes = document.createElement('div');
  panes.className = 'ycm-panes';
  panes.innerHTML =
    '<div class="ycm-pane"><p class="ycm-pane-label">客户端 A(执行撤销)</p>' +
    '<div class="ycm-editor"></div></div>' +
    '<div class="ycm-pane"><p class="ycm-pane-label">客户端 B</p>' +
    '<div class="ycm-editor"></div></div>';
  mount.append(panes);
  const editors = panes.querySelectorAll<HTMLElement>('.ycm-editor');
  const editorA = editors[0];
  const editorB = editors[1];
  if (!editorA || !editorB) {
    throw new Error('范例舞台结构不完整。');
  }

  let current: Built | null = null;
  let run = 0;
  let disposed = false;

  function baseSnapshot(engine: UndoCompareEngine, status: string): UndoCompareSnapshot {
    return {
      engineLabel: ENGINE_LABELS[engine],
      status,
      textAfterA: '…',
      textAfterB: '…',
      removedByUndo: '…',
      yjsStackDepth: '…',
    };
  }

  async function replay(engine: UndoCompareEngine) {
    const id = ++run;
    current?.destroy();
    current = null;
    emit(baseSnapshot(engine, '重放中…'));

    const built = buildScenario(engine, editorA, editorB);
    if (id !== run || disposed) {
      built.destroy();
      return;
    }
    current = built;

    // 固定序列:A 输入「甲」→ 同步给 B;650ms 后 B 在末尾输入「乙」→ 同步给 A。
    built.viewA.dispatch({ changes: { from: 0, insert: '甲' } });
    await sleep(650);
    if (id !== run || disposed) return;
    built.viewB.dispatch({ changes: { from: built.viewB.state.doc.length, insert: '乙' } });
    await sleep(650);
    if (id !== run || disposed) return;

    const before = built.a.ytext.toString(); // '甲乙'
    // 各引擎自己的撤销入口:Yjs 是 UndoManager.undo()(快捷键命令内部即它),
    // CM 历史是 historyKeymap 绑定的 undo 命令。
    if (engine === 'yjs') {
      built.a.undoManager.undo();
    } else {
      cmUndo(built.viewA);
    }
    await sleep(80);
    if (id !== run || disposed) return;

    const afterA = built.a.ytext.toString();
    const removedByUndo =
      afterA === '乙'
        ? '「甲」— A 自己的输入'
        : afterA === '甲'
          ? '「乙」— B 刚输入的字!'
          : `${before} → ${afterA}`;

    emit({
      engineLabel: ENGINE_LABELS[engine],
      status: '完成',
      textAfterA: JSON.stringify(afterA),
      textAfterB: JSON.stringify(built.b.ytext.toString()),
      removedByUndo,
      yjsStackDepth: `${built.a.undoManager.undoStack.length} 步`,
    });
  }

  void replay('yjs');

  return {
    update(options) {
      void replay(options.engine);
    },
    dispose() {
      disposed = true;
      run += 1;
      current?.destroy();
      current = null;
      panes.remove();
    },
  };
}
