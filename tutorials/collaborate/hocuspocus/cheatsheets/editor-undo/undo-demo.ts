/**
 * 范例介绍：演示协同编辑下「本地撤销只回退自己的变更」的作用域语义。
 * 模拟语义：真实部署中两端各有一个 Y.Doc，由 Hocuspocus 服务器转发 update；
 * 文档页内没有 WebSocket 服务器，这里用内存 relay 模拟服务器转发：每条本地
 * update 直接应用到对方文档，并把对方文档标记为 origin。两个真实 Tiptap
 * 编辑器分别挂在本地与同事的 Y.Doc 上，各自配置 Collaboration 扩展
 * （StarterKit 已关闭 undoRedo，撤销由 Collaboration 接管）。
 * 输入：在「本地编辑器」直接键入（编辑器内按 Ctrl+Z / Cmd+Z 同样生效）；
 * 「撤销 / 重做」按钮与 Controls 的「本地操作」等效；Controls 的
 * 「同事插入文字」触发同事编辑器的一次本地插入。
 * 预期结果：本地撤销只回退本地步骤——同事刚插入的内容原地保留；撤销产生
 * 一条新的 update 上行（计数加一），同事编辑器同步移除被撤销的文字；重做
 * 找回本地步骤；新的本地键入会清空重做栈。
 * 阅读主线：relay 的转发与 origin 标记 → 两个编辑器的扩展接线 →
 * undo() / redo() 命令 → 读数（撤销栈 / 重做栈 / 上行计数 / 两端一致性）
 * 与事件日志核对。
 */
import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';

/** 本地操作选择：idle 仅为初始占位，不触发动作。 */
export type DemoAction = 'idle' | 'undo' | 'redo';

export interface UndoDemoOptions {
  /** 同事插入的文字：每次变化作为同事编辑器的一次本地插入。 */
  peerInsert: string;
  /** 本地操作：与舞台「撤销 / 重做」按钮等效。 */
  action: DemoAction;
}

export interface UndoDemoEvent {
  text: string;
  tone: 'edit' | 'undo' | 'peer' | 'sync';
}

export interface UndoDemoSnapshot {
  localText: string;
  peerText: string;
  /** 本地撤销栈深度：只含本地 origin 的变更。 */
  undoDepth: number;
  /** 本地重做栈深度：任何一次新的本地编辑都会清空。 */
  redoDepth: number;
  /** 本地产生的 update 条数：键入、撤销、重做各算一条。 */
  localUpdates: number;
  converged: boolean;
  events: UndoDemoEvent[];
}

export interface UndoDemoInstance {
  update(options: UndoDemoOptions): void;
  undo(): void;
  redo(): void;
  dispose(): void;
}

/** Collaboration 扩展默认读写的 Yjs 字段名。 */
const FIELD = 'default';
/** 共享底稿：两端初始同步的公共内容。 */
const BASE_TITLE = '协同会议纪要';
/** 事件日志最多保留条数。 */
const MAX_EVENTS = 30;

/** 演示外壳样式：只在首次创建时注入一次（ud-readout 覆盖共享样式的绝对定位）。 */
const DEMO_STYLE_ID = 'editor-undo-demo-style';

const DEMO_CSS = `
.ud-demo { display: flex; flex-direction: column; gap: 10px; padding: 12px;
  border: 1px solid #dbe3f0; border-radius: 8px; background: #f8fafc; }
.ud-toolbar { display: flex; align-items: center; gap: 8px; }
.ud-btn { padding: 3px 14px; border: 1px solid #b9c6de; border-radius: 5px;
  background: #ffffff; color: #24344d;
  font: 600 12px/1.7 ui-sans-serif, system-ui, sans-serif; cursor: pointer; }
.ud-btn:disabled { opacity: 0.45; cursor: default; }
.ud-hint { margin-left: auto; color: #64748b;
  font: 12px/1.5 ui-sans-serif, system-ui, sans-serif; }
.ud-panes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ud-pane { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ud-pane header { color: #334155;
  font: 600 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
.ud-editor { border: 1px solid #dbe3f0; border-radius: 6px; background: #ffffff;
  padding: 6px 10px; color: #1e293b;
  font: 14px/1.6 ui-sans-serif, system-ui, sans-serif; }
.ud-pane--peer .ud-editor { background: #f8fafc; }
.ud-editor .ProseMirror { min-height: 84px; outline: none; }
.ud-log { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0;
  list-style: none;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.ud-log__item--edit { color: #3b5bdb; }
.ud-log__item--undo { color: #b45309; }
.ud-log__item--peer { color: #166534; }
.ud-log__item--sync { color: #64748b; }
.ud-readout { position: static; width: fit-content; }
`;

function injectStyle(): void {
  if (document.getElementById(DEMO_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = DEMO_STYLE_ID;
  style.textContent = DEMO_CSS;
  document.head.append(style);
}

export function createUndoDemo(
  root: HTMLElement,
  emit: (snapshot: UndoDemoSnapshot) => void,
): UndoDemoInstance {
  injectStyle();

  // ---------- 舞台外壳：工具栏 + 双栏编辑器 + 事件日志 ----------
  const stage = document.createElement('div');
  stage.className = 'ud-demo';

  const toolbar = document.createElement('div');
  toolbar.className = 'ud-toolbar';
  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'ud-btn';
  undoButton.textContent = '撤销';
  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.className = 'ud-btn';
  redoButton.textContent = '重做';
  const hint = document.createElement('span');
  hint.className = 'ud-hint';
  hint.textContent = '在左侧编辑器键入，Ctrl+Z / Cmd+Z 同样生效';
  toolbar.append(undoButton, redoButton, hint);

  function buildPane(title: string, isPeer: boolean): HTMLElement {
    const pane = document.createElement('section');
    pane.className = isPeer ? 'ud-pane ud-pane--peer' : 'ud-pane';
    const header = document.createElement('header');
    header.textContent = title;
    const body = document.createElement('div');
    body.className = 'ud-editor';
    pane.append(header, body);
    return pane;
  }

  const myPaneBody = buildPane('本地编辑器 · 你的撤销栈', false).querySelector(
    '.ud-editor',
  ) as HTMLElement;
  const peerPaneBody = buildPane(
    '同事编辑器 · 实时下行（只读）',
    true,
  ).querySelector('.ud-editor') as HTMLElement;

  const panes = document.createElement('div');
  panes.className = 'ud-panes';
  panes.append(myPaneBody.parentElement as HTMLElement, peerPaneBody.parentElement as HTMLElement);

  const logList = document.createElement('ul');
  logList.className = 'ud-log';

  stage.append(toolbar, panes, logList);
  root.append(stage);

  // ---------- 两端文档：真实部署里经 Hocuspocus 服务器转发 ----------
  const myDoc = new Y.Doc();
  const peerDoc = new Y.Doc();

  let options: UndoDemoOptions = { peerInsert: '', action: 'idle' };
  let localUpdates = 0;
  let events: UndoDemoEvent[] = [];

  // 内存 relay：按服务器转发语义复刻 update 通道，origin 用对方文档标记
  myDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === peerDoc) {
      return;
    }
    // 本地产生的 update：键入、撤销、重做各算一条
    localUpdates += 1;
    Y.applyUpdate(peerDoc, update, myDoc);
  });

  peerDoc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === myDoc) {
      return;
    }
    Y.applyUpdate(myDoc, update, peerDoc);
  });

  // 初始底稿：先写进本地文档，再作为既有内容同步给同事（不经编辑器，不入撤销栈）
  const paragraph = new Y.XmlElement('paragraph');
  paragraph.insert(0, [new Y.Text(BASE_TITLE)]);
  myDoc.getXmlFragment(FIELD).insert(0, [paragraph]);
  Y.applyUpdate(peerDoc, Y.encodeStateAsUpdate(myDoc), myDoc);

  // ---------- 两个真实编辑器：各自的撤销栈来自各自的 Collaboration 扩展 ----------
  const myEditor = new Editor({
    element: myPaneBody,
    extensions: [
      // 关键接线：关闭 StarterKit 自带的单机历史（Tiptap 2 写法是 history: false），
      // undo / redo 命令与快捷键由 Collaboration 扩展接管
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: myDoc }),
    ],
  });
  const peerEditor = new Editor({
    element: peerPaneBody,
    editable: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: peerDoc }),
    ],
  });

  // Collaboration 扩展的撤销插件 key 以 'y-undo$' 开头，状态里持有它创建的
  // Y.UndoManager——这里只读栈深度，撤销行为完全走扩展的默认实现
  function undoManagerOf(editor: Editor): Y.UndoManager | undefined {
    const plugin = editor.state.plugins.find(item => item.key.startsWith('y-undo$'));
    const state = plugin?.getState(editor.state) as
      | { undoManager?: Y.UndoManager }
      | undefined;
    return state?.undoManager;
  }

  const myUndoManager = undoManagerOf(myEditor);

  function undoDepth(): number {
    return myUndoManager?.undoStack.length ?? 0;
  }

  function redoDepth(): number {
    return myUndoManager?.redoStack.length ?? 0;
  }

  // ---------- 事件日志 ----------
  let lastEditLogAt = 0;

  function paintLog(): void {
    const recent = events.slice(-3);
    logList.replaceChildren(
      ...recent.map(event => {
        const item = document.createElement('li');
        item.className = `ud-log__item ud-log__item--${event.tone}`;
        item.textContent = `· ${event.text}`;
        return item;
      }),
    );
  }

  function log(text: string, tone: UndoDemoEvent['tone']): void {
    events.push({ text, tone });
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
    paintLog();
  }

  // 连续键入合并为一条日志，避免逐键刷屏
  function logTyping(): void {
    const now = Date.now();
    const text = `本地键入：捕获进撤销栈（现 ${undoDepth()} 步）`;
    const last = events.at(-1);
    if (last && last.tone === 'edit' && now - lastEditLogAt < 1500) {
      last.text = text;
      lastEditLogAt = now;
      paintLog();
      return;
    }
    lastEditLogAt = now;
    log(text, 'edit');
  }

  // ---------- 操作入口：与正文命令一一对应 ----------
  function undo(): void {
    const done = myEditor.commands.undo();
    log(
      done ? 'undo()：回退一步本地变更，作为新 update 上行' : 'undo()：撤销栈为空，命令返回 false',
      'undo',
    );
  }

  function redo(): void {
    const done = myEditor.commands.redo();
    log(
      done ? 'redo()：重做一步本地变更，作为新 update 上行' : 'redo()：重做栈为空，命令返回 false',
      'undo',
    );
  }

  undoButton.addEventListener('click', () => undo());
  redoButton.addEventListener('click', () => redo());

  function appendPeerInsert(text: string): void {
    // 同事在自己的编辑器里插入：一次同事的本地事务，只进同事的撤销栈；
    // 经 relay 下行后在本端是远端更新（origin 不同，不进本地撤销栈）
    const end = peerEditor.state.doc.content.size;
    peerEditor.chain().insertContentAt(end, text).run();
    log(`同事插入「${text}」：进入同事的撤销栈，与本端无关`, 'peer');
  }

  // ---------- 读数：本地事务与远端事务分开记账 ----------
  // 本地键入的事务不带 y-sync 标记；远端下行与撤销回放的事务由同步插件
  // 分发时携带（meta key 以 'y-sync$' 开头），不算新的本地编辑
  myEditor.on('transaction', ({ transaction }) => {
    if (!transaction.docChanged) {
      return;
    }
    const reflected = Object.keys(transaction.meta).some(key => key.startsWith('y-sync$'));
    if (!reflected) {
      logTyping();
    }
    emitSoon();
  });
  peerEditor.on('transaction', () => emitSoon());

  function textOf(editor: Editor): string {
    const text = editor.state.doc.textContent;
    return text.length > 0 ? text : '（空）';
  }

  function snapshot(): UndoDemoSnapshot {
    const localText = textOf(myEditor);
    const peerText = textOf(peerEditor);
    return {
      localText,
      peerText,
      undoDepth: undoDepth(),
      redoDepth: redoDepth(),
      localUpdates,
      converged: localText === peerText,
      events: events.slice(-3),
    };
  }

  let emitScheduled = false;

  function emitSoon(): void {
    if (emitScheduled) {
      return;
    }
    emitScheduled = true;
    requestAnimationFrame(() => {
      emitScheduled = false;
      undoButton.disabled = !myEditor.can().undo();
      redoButton.disabled = !myEditor.can().redo();
      emit(snapshot());
    });
  }

  log('初始同步：两端共享底稿（底稿先于编辑器写入，不在撤销栈里）', 'sync');
  emitSoon();

  return {
    update(next) {
      if (next.peerInsert.length > 0 && next.peerInsert !== options.peerInsert) {
        appendPeerInsert(next.peerInsert);
      }
      if (next.action !== options.action && next.action !== 'idle') {
        if (next.action === 'undo') {
          undo();
        } else {
          redo();
        }
      }
      options = { ...next };
      emitSoon();
    },
    undo,
    redo,
    dispose() {
      myEditor.destroy();
      peerEditor.destroy();
      myDoc.destroy();
      peerDoc.destroy();
      stage.remove();
    },
  };
}
