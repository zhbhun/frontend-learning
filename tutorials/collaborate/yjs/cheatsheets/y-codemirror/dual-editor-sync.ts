/**
 * 范例:yCollab 把同一个 Y.Text 绑进两个 CodeMirror 6 编辑器,双端实时互同步,
 * 并经 awareness 渲染对端的光标与选区。
 * 输入:读者直接点进任一编辑器输入、拖选;「中继连接」开关模拟断网。
 * 操作:两个 Y.Doc 模拟两个客户端,A 端预写初始文本后全量对答;手写中继互发
 *      文档更新(update 事件 → applyUpdate)与 awareness 消息,扮演 Provider;
 *      每端用 yCollab(ytext, awareness, { undoManager }) 绑定,keymap 放最前。
 * 预期:任一端输入,另一端立即出现同样的文本,B 端 delta 读数显示 retain/insert;
 *      一端获得焦点并移动光标/选区,另一端渲染该端颜色的光标与选区高亮,
 *      读数里的光标索引来自相对位置换算;断开中继后编辑只在本地生效,
 *      重开中继经全量对答补齐。
 * 阅读主线:createClient(建 doc/ytext/awareness/undoManager)→ syncFull(全量对答)→
 *      createRelay(文档 + awareness 双向中继)→ attachView(yCollab 接线)→
 *      snapshot(两端文本、delta、远程光标索引)。
 */
import * as Y from 'yjs';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import {
  yCollab,
  yUndoManagerKeymap,
  ySyncFacet,
  type YSyncConfig,
} from 'y-codemirror.next';

export interface DualEditorOptions {
  /** 中继连接:关闭模拟断网,重开时做一次全量对答。 */
  relay: boolean;
}

export interface DualEditorSnapshot {
  textA: string;
  textB: string;
  converged: string;
  deltaOnB: string;
  cursorBInA: string;
  cursorAInB: string;
  relayState: string;
}

export interface DualEditorInstance {
  update(options: DualEditorOptions): void;
  dispose(): void;
}

/** awareness 'update' 事件载荷:本次发生变化的 clientID 列表。 */
interface AwarenessDelta {
  added: number[];
  updated: number[];
  removed: number[];
}

interface CursorState {
  cursor?: { anchor?: unknown; head?: unknown };
}

interface Client {
  label: string;
  doc: Y.Doc;
  ytext: Y.Text;
  awareness: Awareness;
  undoManager: Y.UndoManager;
  view: EditorView | null;
  /** 本端 YSyncConfig:本地输入写回 Y.Text 时的事务 origin,防回环的判据。 */
  syncConf: YSyncConfig | null;
}

// 中继 origin 标记:对端 apply 回来的消息带此标记,遇到就跳过防回声。
const RELAY_ORIGIN = 'relay';
const INITIAL_TEXT = '协作真值在 Y.Text 里,两个编辑器都是它的视图。';

function createClient(label: string): Client {
  const doc = new Y.Doc();
  const ytext = doc.getText('codemirror');
  // 真实项目由 Provider 创建:const awareness = provider.awareness。
  const awareness = new Awareness(doc);
  // user 字段驱动对端的远程光标配色与名字标签;缺省渲染 Anonymous / #30bced。
  awareness.setLocalStateField('user', {
    name: `用户${label}`,
    color: label === 'A' ? '#4f7cff' : '#f59e0b',
    colorLight: (label === 'A' ? '#4f7cff' : '#f59e0b') + '33',
  });
  return {
    label,
    doc,
    ytext,
    awareness,
    undoManager: new Y.UndoManager(ytext),
    view: null,
    syncConf: null,
  };
}

/**
 * 组装编辑器:初始 doc 取 ytext.toString(),此后内容以 Y.Text 为真值。
 * keymap.of(yUndoManagerKeymap) 放在最前——CodeMirror 按扩展顺序解析按键,
 * 先声明者优先;若放在 basicSetup 之后,Mod-z 会被它自带的 historyKeymap 抢走。
 */
function attachView(client: Client, parent: HTMLElement): void {
  const extensions: Extension[] = [
    keymap.of(yUndoManagerKeymap),
    EditorView.lineWrapping,
    yCollab(client.ytext, client.awareness, { undoManager: client.undoManager }),
  ];
  client.view = new EditorView({
    state: EditorState.create({ doc: client.ytext.toString(), extensions }),
    parent,
  });
  client.syncConf = client.view.state.facet(ySyncFacet);
}

function syncFull(a: Client, b: Client) {
  // 全量对答:文档按 state vector 补增量,awareness 全量互认。
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc)), 'remote');
  Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc, Y.encodeStateVector(a.doc)), 'remote');
  applyAwarenessUpdate(
    b.awareness,
    encodeAwarenessUpdate(a.awareness, [...a.awareness.getStates().keys()]),
    RELAY_ORIGIN,
  );
  applyAwarenessUpdate(
    a.awareness,
    encodeAwarenessUpdate(b.awareness, [...b.awareness.getStates().keys()]),
    RELAY_ORIGIN,
  );
}

function createRelay(a: Client, b: Client) {
  let connected = false;
  const disconnectors: Array<() => void> = [];
  function pipe(from: Client, to: Client) {
    // 文档通道:Provider 转发更新时带固定 origin,远端事务因此与本地可区分。
    const onDocUpdate = (update: Uint8Array) => {
      if (connected) Y.applyUpdate(to.doc, update, 'remote');
    };
    // awareness 通道:监听 update(含心跳与下线 null 帧),变化的客户端全量编码转发。
    const onAwarenessUpdate = (delta: AwarenessDelta, origin: unknown) => {
      if (origin === RELAY_ORIGIN || !connected) return;
      const changed = delta.added.concat(delta.updated, delta.removed);
      applyAwarenessUpdate(
        to.awareness,
        encodeAwarenessUpdate(from.awareness, changed),
        RELAY_ORIGIN,
      );
    };
    from.doc.on('update', onDocUpdate);
    from.awareness.on('update', onAwarenessUpdate);
    disconnectors.push(() => {
      from.doc.off('update', onDocUpdate);
      from.awareness.off('update', onAwarenessUpdate);
    });
  }
  return {
    set(on: boolean) {
      if (connected === on) {
        return;
      }
      connected = on;
      if (!on) {
        disconnectors.forEach((off) => off());
        disconnectors.length = 0;
        return;
      }
      pipe(a, b);
      pipe(b, a);
      syncFull(a, b);
    },
    get on() {
      return connected;
    },
  };
}

/** 对端光标在本端视图中的索引:相对位置 → 绝对位置,内容变化后自动适配。 */
function describeRemoteCursor(seer: Client, other: Client): string {
  const state = seer.awareness.getStates().get(other.awareness.clientID) as
    | CursorState
    | undefined;
  const cursor = state?.cursor;
  if (!cursor || cursor.head == null) {
    return '无(对端尚未聚焦)';
  }
  const head = Y.createAbsolutePositionFromRelativePosition(
    Y.createRelativePositionFromJSON(cursor.head),
    seer.doc,
  );
  return head ? `索引 ${head.index}` : '无(位置已被删除)';
}

export function createDualEditorSync(
  mount: HTMLElement,
  emit: (snapshot: DualEditorSnapshot) => void,
): DualEditorInstance {
  const panes = document.createElement('div');
  panes.className = 'ycm-panes';
  panes.innerHTML =
    '<div class="ycm-pane"><p class="ycm-pane-label">客户端 A(点进去输入、拖选)</p>' +
    '<div class="ycm-editor"></div></div>' +
    '<div class="ycm-pane"><p class="ycm-pane-label">客户端 B(另一端)</p>' +
    '<div class="ycm-editor"></div></div>';
  mount.append(panes);
  const editors = panes.querySelectorAll<HTMLElement>('.ycm-editor');
  const editorA = editors[0];
  const editorB = editors[1];
  if (!editorA || !editorB) {
    throw new Error('范例舞台结构不完整。');
  }

  const a = createClient('A');
  const b = createClient('B');
  // 初始文本在接线前写进 A 的 Y.Text,再全量对答给 B:编辑器 doc 直接取自 Y.Text。
  a.ytext.insert(0, INITIAL_TEXT);
  syncFull(a, b);
  attachView(a, editorA);
  attachView(b, editorB);

  const relay = createRelay(a, b);
  relay.set(true);

  let deltaOnB = '(尚无远端更新)';
  // B 端只记录「非本端编辑器产生」的 delta,即从对端同步进来的变更。
  b.ytext.observe((event, tr) => {
    if (tr.origin !== b.syncConf) {
      deltaOnB = JSON.stringify(event.changes.delta);
    }
  });

  function snapshot(): DualEditorSnapshot {
    const textA = a.ytext.toString();
    const textB = b.ytext.toString();
    return {
      textA,
      textB,
      converged: textA === textB ? '一致' : '不一致!',
      deltaOnB,
      cursorBInA: describeRemoteCursor(a, b),
      cursorAInB: describeRemoteCursor(b, a),
      relayState: relay.on ? '开' : '关(断网)',
    };
  }

  const emitSoon = () => emit(snapshot());
  a.ytext.observe(emitSoon);
  b.ytext.observe(emitSoon);
  a.awareness.on('update', emitSoon);
  b.awareness.on('update', emitSoon);
  emitSoon();

  return {
    update(options) {
      relay.set(options.relay);
      emitSoon();
    },
    dispose() {
      a.view?.destroy();
      b.view?.destroy();
      a.awareness.destroy();
      b.awareness.destroy();
      a.doc.destroy();
      b.doc.destroy();
      panes.remove();
    },
  };
}
